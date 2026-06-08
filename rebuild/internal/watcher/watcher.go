// Package watcher wraps fsnotify to provide a filtered,
// event-driven stream of file changes.
package watcher

import (
	"fmt"
	"log/slog"
	"path/filepath"
	"strings"

	"github.com/fsnotify/fsnotify"
)

// Event is a filtered file change notification.
type Event struct {
	Path string
	Op   string // "CREATE", "WRITE", "REMOVE", "RENAME", "CHMOD"
}

// IgnoreFunc returns true if the given path should be ignored.
type IgnoreFunc func(path string) bool

// defaultIgnoreExts is the list of file suffixes filtered by
// DefaultIgnore. These are common editor and OS temp files that
// would otherwise produce noisy, useless rebuilds.
var defaultIgnoreExts = []string{
	".swp", ".swo", ".tmp", ".bak", ".pyc", ".lock", "~",
}

// DefaultIgnore filters out common editor swap files, OS metadata
// files, and lock files.
func DefaultIgnore(path string) bool {
	base := filepath.Base(path)
	for _, ext := range defaultIgnoreExts {
		if strings.HasSuffix(base, ext) {
			return true
		}
	}
	switch base {
	case ".DS_Store", "Thumbs.db", "desktop.ini":
		return true
	}
	return false
}

// Config configures a Watcher.
type Config struct {
	Paths   []string
	Ignore  IgnoreFunc
	Handler func(Event)
	Logger  *slog.Logger
}

// Watcher watches one or more paths and forwards filtered events
// to the configured handler.
type Watcher struct {
	fsw     *fsnotify.Watcher
	logger  *slog.Logger
	ignore  IgnoreFunc
	handler func(Event)
}

// New creates and starts a Watcher. It begins emitting events
// immediately via a background goroutine. Call Close to stop.
func New(cfg Config) (*Watcher, error) {
	if cfg.Ignore == nil {
		cfg.Ignore = DefaultIgnore
	}
	if cfg.Logger == nil {
		cfg.Logger = slog.Default()
	}
	if cfg.Handler == nil {
		return nil, fmt.Errorf("watcher: Handler is required")
	}

	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("create fsnotify watcher: %w", err)
	}

	w := &Watcher{
		fsw:     fsw,
		logger:  cfg.Logger,
		ignore:  cfg.Ignore,
		handler: cfg.Handler,
	}

	for _, p := range cfg.Paths {
		abs, err := filepath.Abs(p)
		if err != nil {
			_ = fsw.Close()
			return nil, fmt.Errorf("resolve path %q: %w", p, err)
		}
		if err := fsw.Add(abs); err != nil {
			_ = fsw.Close()
			return nil, fmt.Errorf("watch %q: %w", abs, err)
		}
		cfg.Logger.Info("watching path", "path", abs)
	}

	go w.loop()
	return w, nil
}

func (w *Watcher) loop() {
	for {
		select {
		case ev, ok := <-w.fsw.Events:
			if !ok {
				return
			}
			if w.ignore(ev.Name) {
				continue
			}
			if ev.Op&(fsnotify.Create|fsnotify.Write|fsnotify.Remove|fsnotify.Rename|fsnotify.Chmod) == 0 {
				continue
			}
			w.handler(Event{Path: ev.Name, Op: ev.Op.String()})
		case err, ok := <-w.fsw.Errors:
			if !ok {
				return
			}
			w.logger.Error("watcher error", "err", err)
		}
	}
}

// Close stops the Watcher and releases its resources. It is
// safe to call multiple times.
func (w *Watcher) Close() error {
	return w.fsw.Close()
}
