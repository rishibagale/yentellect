package main

import (
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go_watcher/watcher"
)

func main() {
	// --- CLI Flags ---
	watchDir := flag.String("dir", ".", "Directory to watch for changes")
	command := flag.String("cmd", "", "Build command to run on file changes (required)")
	debounce := flag.Duration("debounce", 500*time.Millisecond, "Debounce duration after last file event")
	logLevel := flag.String("log-level", "info", "Log level: debug, info, warn, error")
	logFormat := flag.String("log-format", "text", "Log format: text or json")
	ignoreList := flag.String("ignore", "node_modules,.git,vendor,tmp,.idea", "Comma-separated list of paths to ignore")
	flag.Parse()

	// --- Validate required flags ---
	if *command == "" {
		fmt.Fprintln(os.Stderr, "Error: -cmd flag is required. Example: -cmd \"go build ./...\"")
		flag.Usage()
		os.Exit(1)
	}

	// --- Set up structured logging ---
	logger := buildLogger(*logLevel, *logFormat)

	// --- Parse ignore patterns ---
	ignorePatterns := parseCSV(*ignoreList)

	// --- Build config ---
	cfg := watcher.Config{
		WatchDir:         *watchDir,
		Command:          *command,
		DebounceDuration: *debounce,
		IgnorePatterns:   ignorePatterns,
	}

	// --- Create and start watcher ---
	w, err := watcher.New(cfg, logger)
	if err != nil {
		logger.Error("Failed to create watcher", slog.Any("error", err))
		os.Exit(1)
	}

	if err := w.Start(); err != nil {
		logger.Error("Failed to start watcher", slog.Any("error", err))
		os.Exit(1)
	}

	// --- Graceful shutdown on SIGINT / SIGTERM ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	logger.Info("Watching for changes. Press Ctrl+C to stop.")
	<-quit

	w.Stop()
}

// buildLogger creates a slog.Logger with the specified level and format.
func buildLogger(level, format string) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{Level: lvl}

	var handler slog.Handler
	if format == "json" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	return slog.New(handler)
}

// parseCSV splits a comma-separated string into a trimmed slice.
func parseCSV(s string) []string {
	if s == "" {
		return nil
	}
	var result []string
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i] == ',' {
			part := trimSpace(s[start:i])
			if part != "" {
				result = append(result, part)
			}
			start = i + 1
		}
	}
	return result
}

// trimSpace removes leading/trailing spaces from a string without importing strings pkg.
func trimSpace(s string) string {
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}
