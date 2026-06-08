package watcher

import (
	"log/slog"
	"os"
	"testing"
	"time"
)

func TestNewWatcher(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// Test config validation
	t.Run("empty command returns error", func(t *testing.T) {
		cfg := Config{
			WatchDir: ".",
			Command:  "",
		}
		_, err := New(cfg, logger)
		if err == nil {
			t.Error("expected error for empty command, got nil")
		}
	})

	t.Run("default values applied", func(t *testing.T) {
		cfg := Config{
			Command: "echo hello",
		}
		w, err := New(cfg, logger)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		defer w.Stop()

		if w.config.WatchDir != "." {
			t.Errorf("expected WatchDir to be '.', got %s", w.config.WatchDir)
		}
		if w.config.DebounceDuration != 500*time.Millisecond {
			t.Errorf("expected default debounce duration to be 500ms, got %v", w.config.DebounceDuration)
		}
	})
}

func TestShouldIgnore(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	cfg := Config{
		Command:        "echo hello",
		IgnorePatterns: []string{"node_modules", "vendor", "tmp"},
	}
	w, err := New(cfg, logger)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer w.Stop()

	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		{"hidden file", ".gitignore", true},
		{"normal file", "main.go", false},
		{"ignored folder file", "node_modules/lodash/index.js", true},
		{"temporary file", "file.go~", true},
		{"nested ignored file", "src/vendor/pkg/test.go", true},
		{"normal nested file", "src/pkg/test.go", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := w.shouldIgnore(tt.path)
			if got != tt.expected {
				t.Errorf("shouldIgnore(%q) = %v, expected %v", tt.path, got, tt.expected)
			}
		})
	}
}
