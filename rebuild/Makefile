.PHONY: build test run fmt vet clean tidy

BIN := bin/rebuild

build:
	@mkdir -p bin
	go build -o $(BIN) .

test:
	go test ./... -race -v

fmt:
	go fmt ./...

vet:
	go vet ./...

tidy:
	go mod tidy

run: build
	./$(BIN) --command "echo building $$RANDOM" --paths . --delay 200ms

clean:
	rm -rf bin/
