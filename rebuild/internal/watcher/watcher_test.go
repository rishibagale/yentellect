package watcher

import (
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func TestDefaultIgnore(t *testing.T) {
	cases := []struct {
		path string
		want bool
	}{
		{"file.swp", true},
		{"file.swo", true},
		{"file.tmp", true},
		{"file.bak", true},
		{"file.pyc", true},
		{"file.lock", true},
		{"file~", true},
		{".DS_Store", true},
		{"Thumbs.db", true},
		{"main.go", false},
		{"src/index.js", false},
		{".env", false},
		{"Makefile", false},
	}
	for _, c := range cases {
		if got := DefaultIgnore(c.path); got != c.want {
			t.Errorf("DefaultIgnore(%q) = %v, want %v", c.path, got, c.want)
		}
	}
}

func TestWatcher_DetectsFileCreation(t *testing.T) {
	dir := t.TempDir()

	var (
		mu     sync.Mutex
		events []Event
	)
	saw := make(chan struct{}, 1)

	w, err := New(Config{
		Paths:  []string{dir},
		Ignore: DefaultIgnore,
		Handler: func(e Event) {
			mu.Lock()
			events = append(events, e)
			mu.Unlock()
			select {
			case saw <- struct{}{}:
			default:
			}
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()

	if err := os.WriteFile(filepath.Join(dir, "hello.txt"), []byte("hi"), 0o644); err != nil {
		t.Fatal(err)
	}

	select {
	case <-saw:
	case <-time.After(5 * time.Second):
		t.Fatal("timeout waiting for file change event")
	}

	mu.Lock()
	defer mu.Unlock()
	if len(events) == 0 {
		t.Fatal("expected at least one event")
	}
}

func TestWatcher_IgnoresEditorTempFiles(t *testing.T) {
	dir := t.TempDir()

	var (
		mu     sync.Mutex
		events []Event
	)

	w, err := New(Config{
		Paths:  []string{dir},
		Ignore: DefaultIgnore,
		Handler: func(e Event) {
			mu.Lock()
			events = append(events, e)
			mu.Unlock()
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()

	// Touch a swap file the default ignore should filter.
	if err := os.WriteFile(filepath.Join(dir, "main.go.swp"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	time.Sleep(500 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()
	if len(events) != 0 {
		t.Fatalf("expected 0 events for .swp file, got %d", len(events))
	}
}

func TestWatcher_RequiresHandler(t *testing.T) {
	_, err := New(Config{Paths: []string{t.TempDir()}})
	if err == nil {
		t.Fatal("expected error when Handler is nil")
	}
}
