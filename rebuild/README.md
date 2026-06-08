# rebuild

A small, dependency-light Go CLI that watches directories, debounces file changes, and runs a configurable build command.

## Features

- Watches one or more paths via [fsnotify](https://github.com/fsnotify/fsnotify)
- Debounces rapid file changes (configurable delay)
- Runs an arbitrary shell command on change
- Structured logging via `log/slog` (text or JSON)
- Graceful shutdown on SIGINT / SIGTERM (cancels in-flight build, stops watcher, drains pending events)
- Initial build on startup (skippable via `--no-initial`)
- Filters common editor swap, lock, and OS temp files
- Cross-platform: uses `/bin/sh -c` on Unix, `cmd /c` on Windows

## Install

```sh
go install github.com/example/rebuild@latest
```

Or build from source:

```sh
make build
```

## Usage

```sh
rebuild --command "go build ./..." --paths ".,src" --delay 500ms
```

### Flags

| Flag           | Default | Description                                     |
|----------------|---------|-------------------------------------------------|
| `--paths`      | `.`     | Comma-separated list of paths to watch          |
| `--command`    | _none_  | Shell command to run on changes (required)      |
| `--delay`      | `300ms` | Debounce window                                 |
| `--log-level`  | `info`  | `debug`, `info`, `warn`, `error`                |
| `--log-format` | `text`  | `text` or `json`                                |
| `--no-initial` | `false` | Skip the initial build at startup               |
| `--version`    | `false` | Print version and exit                          |

## Examples

Watch Go source and rebuild on change:

```sh
rebuild --command "go build -o bin/app ." --paths ".,cmd,internal"
```

Run tests on save with a 1-second debounce and JSON logs:

```sh
rebuild --command "go test ./..." --paths . --delay 1s --log-format json
```

Run a frontend build:

```sh
rebuild --command "npm run build" --paths "src,public" --delay 250ms
```

## Testing

```sh
make test
```

The unit tests cover:
- **debouncer**: coalescing, reset, stop, multiple cycles, parent cancellation
- **watcher**: default ignore rules, end-to-end event detection, handler requirement
- **runner**: success, failure, stderr capture, empty command, context cancellation

## Architecture

```
        ┌──────────┐  events   ┌────────────┐  trigger  ┌─────────────┐
        │ watcher  │ ────────► │ debouncer  │ ────────► │ runner.Run  │
        └──────────┘           └────────────┘           └─────────────┘
              │                       │                       │
              ▼                       ▼                       ▼
         fsnotify                time.AfterFunc          exec.Command
                                                          (sh / cmd)
```

- **watcher** wraps `fsnotify`, filters ignore patterns, and forwards events.
- **debouncer** coalesces bursts of events into a single trigger after a quiet period.
- **runner** executes the build command under a context, so a SIGINT mid-build cancels it cleanly.
- **main** wires them together, owns the signal-bound root context, and serializes runs with a mutex.

## Project Structure

```
rebuild/
├── go.mod
├── Makefile
├── README.md
├── main.go
└── internal/
    ├── debouncer/
    │   ├── debouncer.go
    │   └── debouncer_test.go
    ├── runner/
    │   ├── runner.go
    │   └── runner_test.go
    └── watcher/
        ├── watcher.go
        └── watcher_test.go
```

## Build & Run

```sh
# from inside the rebuild/ directory
go mod tidy
go test ./...
go build -o bin/rebuild .
./bin/rebuild --command "go build ./..." --paths .
```

Hit `Ctrl-C` to trigger the graceful shutdown path: the in-flight build (if any) is cancelled,
the watcher is closed, and the process exits with a final structured log line.

## License

MIT
