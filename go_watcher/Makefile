# Go Watcher - Build Makefile

BINARY_NAME=go-watcher
MAIN_PKG=.

.PHONY: all build run test clean fmt vet tidy help

all: vet test build

## build: Compile the binary for the current OS/arch
build:
	go build -o $(BINARY_NAME) $(MAIN_PKG)

## build-linux: Cross-compile for Linux
build-linux:
	GOOS=linux GOARCH=amd64 go build -o $(BINARY_NAME)-linux-amd64 $(MAIN_PKG)

## build-windows: Cross-compile for Windows
build-windows:
	GOOS=windows GOARCH=amd64 go build -o $(BINARY_NAME)-windows-amd64.exe $(MAIN_PKG)

## run: Run with a sample watch command (watches current dir, echoes changes)
run: build
	./$(BINARY_NAME) -dir . -cmd "echo 'Build triggered!'" -debounce 500ms -log-level debug

## test: Run all unit tests with verbose output
test:
	go test ./... -v -timeout 30s

## test-cover: Run tests with coverage report
test-cover:
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report written to coverage.html"

## fmt: Format all Go source files
fmt:
	gofmt -w .

## vet: Run go vet to find common issues
vet:
	go vet ./...

## tidy: Clean up go.mod and go.sum
tidy:
	go mod tidy

## clean: Remove build artifacts
clean:
	rm -f $(BINARY_NAME) $(BINARY_NAME)-* coverage.out coverage.html

## help: Print this help
help:
	@grep -h "## " $(MAKEFILE_LIST) | sed 's/## //' | column -t -s ':'
