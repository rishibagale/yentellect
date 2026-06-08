package runner

import (
	"context"
	"runtime"
	"strings"
	"testing"
	"time"
)

func TestRunner_Success(t *testing.T) {
	r := New(nil)
	res := r.Run(context.Background(), "echo hello")
	if !res.Success() {
		t.Fatalf("expected success, got err=%v exit=%d stderr=%q", res.Err, res.ExitCode, res.Stderr)
	}
	if !strings.Contains(res.Stdout, "hello") {
		t.Fatalf("expected stdout to contain 'hello', got %q", res.Stdout)
	}
}

func TestRunner_FailureExitCode(t *testing.T) {
	r := New(nil)
	res := r.Run(context.Background(), "exit 7")
	if res.Success() {
		t.Fatal("expected failure")
	}
	if res.ExitCode != 7 {
		t.Fatalf("expected exit code 7, got %d", res.ExitCode)
	}
}

func TestRunner_Empty(t *testing.T) {
	r := New(nil)
	res := r.Run(context.Background(), "   ")
	if res.Success() {
		t.Fatal("expected failure for empty command")
	}
	if res.Err == nil {
		t.Fatal("expected an error for empty command")
	}
}

func TestRunner_StderrCapture(t *testing.T) {
	r := New(nil)
	// Use shell-portable syntax: 'cmd' on Windows separates commands with '&',
	// and the redirection operator is the same. The command writes "oops" to
	// stderr and exits with a non-zero status.
	cmd := "echo oops 1>&2"
	if runtime.GOOS == "windows" {
		// cmd.exe uses '&' (or '&&' with short-circuit) to chain commands.
		cmd = "echo oops 1>&2 & exit 1"
	} else {
		cmd = "echo oops 1>&2; exit 1"
	}
	res := r.Run(context.Background(), cmd)
	if res.Success() {
		t.Fatalf("expected failure for %q, got success (stdout=%q stderr=%q)", cmd, res.Stdout, res.Stderr)
	}
	if !strings.Contains(res.Stderr, "oops") {
		t.Fatalf("expected stderr to contain 'oops', got %q", res.Stderr)
	}
}

func TestRunner_ContextCancel(t *testing.T) {
	r := New(nil)
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		time.Sleep(20 * time.Millisecond)
		cancel()
	}()

	start := time.Now()
	res := r.Run(ctx, "sleep 30")
	elapsed := time.Since(start)

	if elapsed > 5*time.Second {
		t.Fatalf("expected prompt cancellation, took %v", elapsed)
	}
	if res.Success() {
		t.Fatal("expected failure due to cancellation")
	}
}
