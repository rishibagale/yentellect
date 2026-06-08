# go-watcher

A lightweight CLI tool written in Go that **watches a directory for file changes**, **debounces rapid events**, and **runs a configurable build command**. Designed for local development workflows.

## Features

- 📂 **Recursive directory watching** via [`fsnotify`](https://github.com/fsnotify/fsnotify)
- ⏱️ **Configurable debounce** — only triggers the build after a quiet period (avoids flooding on saves)
- 🔧 **Fully configurable build command** — any shell command works (`go build`, `npm run build`, `make`, etc.)
- 🛑 **Graceful shutdown** — catches `SIGINT`/`SIGTERM`, cancels in-flight commands cleanly
- 📋 **Structured logging** — supports both `text` and `json` formats with configurable levels
- 🚫 **Ignore patterns** — skip `node_modules`, `.git`, vendor dirs, etc.
- ✅ **Unit tested** — core watcher logic covered with `go test`

---

## Requirements

- [Go 1.21+](https://go.dev/dl/)

---

## Installation

```bash
# Clone or copy the go_watcher directory, then:
cd go_watcher
go mod tidy
go build -o go-watcher .
```

---

## Usage

```
./go-watcher [flags]
```

### Flags

| Flag          | Default                                    | Description                                    |
|---------------|--------------------------------------------|------------------------------------------------|
| `-dir`        | `.`                                        | Directory to watch                             |
| `-cmd`        | *(required)*                               | Command to run on file changes                 |
| `-debounce`   | `500ms`                                    | Quiet period after last event before building  |
| `-log-level`  | `info`                                     | Log level: `debug`, `info`, `warn`, `error`   |
| `-log-format` | `text`                                     | Log format: `text` or `json`                  |
| `-ignore`     | `node_modules,.git,vendor,tmp,.idea`       | Comma-separated ignore patterns                |

---

## Examples

### Watch a Go project and rebuild on changes

```bash
./go-watcher -dir ./src -cmd "go build -o out/app ./..."
```

### Watch and run tests

```bash
./go-watcher -dir . -cmd "go test ./..." -debounce 1s
```

### Use JSON structured logs (for log aggregators)

```bash
./go-watcher -dir . -cmd "make build" -log-format json -log-level debug
```

### Watch a frontend project

```bash
./go-watcher -dir ./src -cmd "npm run build" -ignore "node_modules,dist,.cache" -debounce 300ms
```

---

## Project Structure

```
go_watcher/
├── main.go                 # CLI entrypoint, flag parsing, signal handling
├── watcher/
│   ├── watcher.go          # Core watcher: fsnotify, debounce, command execution
│   └── watcher_test.go     # Unit tests for watcher logic
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

---

## Development

```bash
# Run all tests
make test

# Run tests with coverage
make test-cover

# Format code
make fmt

# Vet for issues
make vet

# Build binary
make build

# Clean build artifacts
make clean
```

---

## How It Works

```
File saved
    │
    ▼
fsnotify event received
    │
    ▼
Debounce timer reset (e.g. 500ms)
    │   (keeps resetting on rapid saves)
    ▼
Timer fires after quiet period
    │
    ▼
Cancel previous build (if still running)
    │
    ▼
Run configured build command
    │
    ├─ Success → log INFO
    └─ Failure → log ERROR
```

---

## Graceful Shutdown

Press `Ctrl+C` (or send `SIGTERM`) to stop the watcher. Any in-progress build command will be **canceled immediately** and the process exits cleanly.

---

## License

MIT
