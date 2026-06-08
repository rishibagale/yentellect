// Command rebuild watches directories for file changes, debounces
// them, and runs a configurable build command.
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/example/rebuild/internal/debouncer"
	"github.com/example/rebuild/internal/runner"
	"github.com/example/rebuild/internal/watcher"
)

const version = "0.1.0"

type config struct {
	paths       string
	command     string
	delay       time.Duration
	logLevel    string
	logFormat   string
	noInitial   bool
	showVersion bool
}

func parseFlags() config {
	var c config
	flag.StringVar(&c.paths, "paths", ".", "Comma-separated list of paths to watch")
	flag.StringVar(&c.command, "command", "", "Shell command to run on changes (required)")
	flag.DurationVar(&c.delay, "delay", 300*time.Millisecond, "Debounce delay")
	flag.StringVar(&c.logLevel, "log-level", "info", "Log level: debug, info, warn, error")
	flag.StringVar(&c.logFormat, "log-format", "text", "Log format: text or json")
	flag.BoolVar(&c.noInitial, "no-initial", false, "Skip the initial build on startup")
	flag.BoolVar(&c.showVersion, "version", false, "Print version and exit")
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr,
			"rebuild %s - watch directories and run a build command\n\nUsage: %s [options]\n\nOptions:\n",
			version, os.Args[0])
		flag.PrintDefaults()
	}
	flag.Parse()
	return c
}

func parseLogLevel(s string) slog.Level {
	switch strings.ToLower(s) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func newLogger(level, format string) *slog.Logger {
	opts := &slog.HandlerOptions{Level: parseLogLevel(level)}
	var h slog.Handler
	switch strings.ToLower(format) {
	case "json":
		h = slog.NewJSONHandler(os.Stderr, opts)
	default:
		h = slog.NewTextHandler(os.Stderr, opts)
	}
	return slog.New(h)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "...(truncated)"
}

func main() {
	cfg := parseFlags()

	if cfg.showVersion {
		fmt.Println("rebuild", version)
		return
	}
	if cfg.command == "" {
		fmt.Fprintln(os.Stderr, "error: --command is required")
		flag.Usage()
		os.Exit(2)
	}

	logger := newLogger(cfg.logLevel, cfg.logFormat)
	slog.SetDefault(logger)

	logger.Info("starting rebuild",
		"version", version,
		"paths", cfg.paths,
		"command", cfg.command,
		"delay", cfg.delay,
	)

	// Root context cancelled on SIGINT/SIGTERM.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	paths := splitAndTrim(cfg.paths, ",")
	for _, p := range paths {
		if _, err := os.Stat(p); err != nil {
			logger.Error("path not accessible", "path", p, "err", err)
			os.Exit(1)
		}
	}

	r := runner.New(logger)
	var runMu sync.Mutex // serialize builds so they never overlap

	deb := debouncer.New(ctx, cfg.delay, func(runCtx context.Context) {
		runMu.Lock()
		defer runMu.Unlock()
		result := r.Run(runCtx, cfg.command)
		if !result.Success() {
			logger.Warn("build failed",
				"command", cfg.command,
				"exit_code", result.ExitCode,
				"stderr", truncate(result.Stderr, 4000),
			)
		}
	})

	w, err := watcher.New(watcher.Config{
		Paths:  paths,
		Ignore: watcher.DefaultIgnore,
		Logger: logger,
		Handler: func(ev watcher.Event) {
			logger.Debug("file change", "path", ev.Path, "op", ev.Op)
			deb.Trigger()
		},
	})
	if err != nil {
		logger.Error("failed to start watcher", "err", err)
		os.Exit(1)
	}

	// Initial build (unless disabled).
	if !cfg.noInitial {
		runMu.Lock()
		logger.Info("running initial build")
		initial := r.Run(ctx, cfg.command)
		runMu.Unlock()
		if !initial.Success() {
			logger.Warn("initial build failed",
				"command", cfg.command,
				"exit_code", initial.ExitCode,
				"stderr", truncate(initial.Stderr, 4000),
			)
		}
	}

	// Wait for shutdown signal.
	<-ctx.Done()
	logger.Info("shutdown signal received, cleaning up")

	deb.Stop()
	if err := w.Close(); err != nil {
		logger.Warn("watcher close error", "err", err)
	}
	logger.Info("rebuild exited cleanly")
}

func splitAndTrim(s, sep string) []string {
	parts := strings.Split(s, sep)
	out := parts[:0]
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
