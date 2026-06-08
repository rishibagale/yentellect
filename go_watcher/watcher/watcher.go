package watcher

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// Config holds the configuration for the watcher
type Config struct {
	WatchDir         string        // Directory to watch
	Command          string        // Command to run (e.g., "go build ./...")
	DebounceDuration time.Duration // Time to wait after the last event before building
	IgnorePatterns   []string      // List of folder/file name substrings to ignore
}

// Watcher manages directory watching and command execution
type Watcher struct {
	config Config
	logger *slog.Logger

	fsWatcher *fsnotify.Watcher
	ctx       context.Context
	cancel    context.CancelFunc
	wg        sync.WaitGroup

	cmdMu      sync.Mutex
	cmdContext context.Context
	cmdCancel  context.CancelFunc
}

// New creates a new Watcher instance
func New(cfg Config, logger *slog.Logger) (*Watcher, error) {
	if cfg.WatchDir == "" {
		cfg.WatchDir = "."
	}
	if cfg.DebounceDuration <= 0 {
		cfg.DebounceDuration = 500 * time.Millisecond
	}
	if cfg.Command == "" {
		return nil, fmt.Errorf("command cannot be empty")
	}

	fsWatcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("failed to create fsnotify watcher: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &Watcher{
		config:    cfg,
		logger:    logger,
		fsWatcher: fsWatcher,
		ctx:       ctx,
		cancel:    cancel,
	}, nil
}

// Start begins watching the directory and runs the command loop
func (w *Watcher) Start() error {
	// Recursively add directories to watch
	err := w.watchDirRecursive(w.config.WatchDir)
	if err != nil {
		w.fsWatcher.Close()
		return fmt.Errorf("failed to watch directory: %w", err)
	}

	w.wg.Add(1)
	go w.runLoop()

	w.logger.Info("Watcher started", 
		slog.String("directory", w.config.WatchDir), 
		slog.String("command", w.config.Command), 
		slog.Duration("debounce", w.config.DebounceDuration))

	return nil
}

// Stop gracefully shuts down the watcher and cancels any running command
func (w *Watcher) Stop() {
	w.logger.Info("Shutting down watcher...")
	w.cancel()            // Cancel watch loop context
	w.fsWatcher.Close()    // Close fsnotify watcher to break block
	w.wg.Wait()           // Wait for watch loop to exit

	// Cancel any running build command
	w.cmdMu.Lock()
	if w.cmdCancel != nil {
		w.logger.Info("Canceling running build command...")
		w.cmdCancel()
	}
	w.cmdMu.Unlock()

	w.logger.Info("Watcher stopped gracefully")
}

// watchDirRecursive walks through directory tree and adds all directories to watch list
func (w *Watcher) watchDirRecursive(dir string) error {
	return filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			// Check ignores
			for _, pattern := range w.config.IgnorePatterns {
				if strings.Contains(path, pattern) {
					return filepath.SkipDir
				}
			}

			w.logger.Debug("Adding directory to watch list", slog.String("path", path))
			if err := w.fsWatcher.Add(path); err != nil {
				return err
			}
		}
		return nil
	})
}

// runLoop listens for events, debounces them, and triggers command execution
func (w *Watcher) runLoop() {
	defer w.wg.Done()

	var timer *time.Timer
	var debounceChan <-chan time.Time

	for {
		select {
		case <-w.ctx.Done():
			if timer != nil {
				timer.Stop()
			}
			return

		case event, ok := <-w.fsWatcher.Events:
			if !ok {
				return
			}

			// Ignore write-only events on directories or temporary/ignored paths
			if w.shouldIgnore(event.Name) {
				continue
			}

			// Check if new directories were created to watch them
			if event.Has(fsnotify.Create) {
				info, err := os.Stat(event.Name)
				if err == nil && info.IsDir() {
					w.logger.Info("New directory detected, adding to watch", slog.String("path", event.Name))
					_ = w.watchDirRecursive(event.Name)
				}
			}

			w.logger.Debug("File event detected", slog.String("file", event.Name), slog.String("op", event.Op.String()))

			// Reset debounce timer
			if timer != nil {
				timer.Stop()
			}
			timer = time.NewTimer(w.config.DebounceDuration)
			debounceChan = timer.C

		case err, ok := <-w.fsWatcher.Errors:
			if !ok {
				return
			}
			w.logger.Error("Watcher error", slog.Any("error", err))

		case <-debounceChan:
			// Timer fired, trigger the build
			debounceChan = nil
			w.logger.Info("Debounce period elapsed. Triggering command...")
			go w.runCommand()
		}
	}
}

// shouldIgnore determines if a file/path should be ignored
func (w *Watcher) shouldIgnore(path string) bool {
	// Skip common temp files or files without names
	base := filepath.Base(path)
	if base == "" || strings.HasPrefix(base, ".") || strings.HasSuffix(base, "~") {
		return true
	}

	for _, pattern := range w.config.IgnorePatterns {
		if strings.Contains(path, pattern) {
			return true
		}
	}
	return false
}

// runCommand handles running the build command, canceling the previous run if still active
func (w *Watcher) runCommand() {
	w.cmdMu.Lock()
	// Cancel previous command execution if still running
	if w.cmdCancel != nil {
		w.logger.Info("Previous command execution is active. Canceling it...")
		w.cmdCancel()
	}

	// Create a new context for this execution
	ctx, cancel := context.WithCancel(w.ctx)
	w.cmdContext = ctx
	w.cmdCancel = cancel
	w.cmdMu.Unlock()

	defer func() {
		w.cmdMu.Lock()
		// Only clear if we are the current command
		if w.cmdContext == ctx {
			w.cmdCancel = nil
			w.cmdContext = nil
		}
		w.cmdMu.Unlock()
		cancel()
	}()

	startTime := time.Now()
	w.logger.Info("Starting build command execution")

	// Parse command (shell support / execution platform compatibility)
	var cmd *exec.Cmd
	if os.Getenv("OS") == "Windows_NT" {
		cmd = exec.CommandContext(ctx, "cmd", "/c", w.config.Command)
	} else {
		cmd = exec.CommandContext(ctx, "sh", "-c", w.config.Command)
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err := cmd.Run()
	duration := time.Since(startTime)

	select {
	case <-ctx.Done():
		w.logger.Warn("Command execution was canceled/interrupted", slog.Duration("duration", duration))
	default:
		if err != nil {
			w.logger.Error("Command failed", slog.Any("error", err), slog.Duration("duration", duration))
		} else {
			w.logger.Info("Command finished successfully", slog.Duration("duration", duration))
		}
	}
}
