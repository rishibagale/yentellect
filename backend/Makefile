# Yentellect Backend Makefile

.PHONY: install test test-cov lint format dev clean

# Install dependencies using uv
install:
	uv sync --all-extras

# Download spaCy model
spacy-model:
	python -m spacy download en_core_web_sm

# Run tests
test:
	uv run pytest -v

# Run tests with coverage
test-cov:
	uv run pytest -v --cov=backend.core --cov-report=term-missing --cov-report=html

# Run linting
lint:
	uv run ruff check backend/
	uv run mypy backend/

# Format code
format:
	uv run ruff format backend/
	uv run black backend/

# Run development server
dev:
	uv run uvicorn backend.api.main:app --reload --port 8000

# Clean build artifacts
clean:
	rm -rf __pycache__ .pytest_cache .mypy_cache .ruff_cache htmlcov dist build *.egg-info
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

# Full setup: install deps, download model, run tests
setup: install spacy-model test

# CI pipeline
ci: lint test-cov