// Package runner executes shell commands with cancellation
// support and captured output.
package runner

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

// Result is the outcome of a single command execution.
type Result struct {
	Command  string
	Stdout   string
	Stderr   string
	ExitCode int
	Err      error
	Duration time.Duration
}

// Success reports whether the command exited cleanly.
func (r Result) Success() bool { return r.Err == nil && r.ExitCode == 0 }

// Runner executes commands. It is safe for concurrent use.
type Runner struct {
	logger *slog.Logger
}

// New returns a new Runner.
func New(logger *slog.Logger) *Runner {
	if logger == nil {
		logger = slog.Default()
	}
	return &Runner{logger: logger}
}

// Run executes the given command string through the platform's
// default shell (/bin/sh -c on Unix, cmd /c on Windows). The
// provided context may cancel the running process.
func (r *Runner) Run(ctx context.Context, command string) Result {
	start := time.Now()
	command = strings.TrimSpace(command)
	if command == "" {
		return Result{
			Err:      fmt.Errorf("empty command"),
			Duration: time.Since(start),
		}
	}

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(ctx, "cmd", "/c", command)
	} else {
		cmd = exec.CommandContext(ctx, "sh", "-c", command)
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	r.logger.Info("running command", "command", command)
	err := cmd.Run()
	duration := time.Since(start)

	res := Result{
		Command:  command,
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		Duration: duration,
	}
	if err != nil {
		res.Err = err
		if exitErr, ok := err.(*exec.ExitError); ok {
			res.ExitCode = exitErr.ExitCode()
		} else {
			res.ExitCode = -1
		}
		r.logger.Error("command failed",
			"command", command,
			"exit_code", res.ExitCode,
			"duration_ms", duration.Milliseconds(),
			"err", err,
		)
	} else {
		r.logger.Info("command succeeded",
			"command", command,
			"duration_ms", duration.Milliseconds(),
		)
	}
	return res
}
