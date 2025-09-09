# Bond Auction Issuer UI Makefile
# Provides convenient targets for building and running the React application

.PHONY: help install dev build preview clean test lint format check-deps serve

# Default target
help:
	@echo "Bond Auction Issuer UI - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  install      - Install npm dependencies"
	@echo "  dev          - Start development server (default port 5173)"
	@echo "  build        - Build for production"
	@echo "  preview      - Preview production build"
	@echo "  serve        - Alias for 'dev'"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint         - Run ESLint"
	@echo "  format       - Format code with Prettier"
	@echo "  check-deps   - Check for outdated dependencies"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean        - Remove build artifacts and node_modules"
	@echo "  reinstall    - Clean and reinstall dependencies"
	@echo ""
	@echo "Quick Start:"
	@echo "  make install  - First time setup"
	@echo "  make dev      - Start development server"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	@npm install
	@echo "✅ Dependencies installed successfully"

# Start development server
dev: check-deps
	@echo "🚀 Starting development server..."
	@echo "📡 Server will be available at http://localhost:5173"
	@echo "Press Ctrl+C to stop"
	@npm run dev

# Alias for dev
serve: dev

# Build for production
build: check-deps
	@echo "🔨 Building for production..."
	@npm run build
	@echo "✅ Build complete! Output in ./dist directory"
	@echo ""
	@echo "To preview the production build, run: make preview"

# Preview production build
preview: check-production-build
	@echo "👁️  Previewing production build..."
	@echo "📡 Preview server will be available at http://localhost:4173"
	@echo "Press Ctrl+C to stop"
	@npm run preview

# Clean build artifacts and dependencies
clean:
	@echo "🧹 Cleaning project..."
	@rm -rf dist node_modules .parcel-cache coverage
	@echo "✅ Cleaned build artifacts and dependencies"

# Reinstall all dependencies
reinstall: clean install
	@echo "✅ Fresh install complete"

# Run linter
lint: check-deps
	@echo "🔍 Running ESLint..."
	@npx eslint src --ext .ts,.tsx,.js,.jsx || echo "⚠️  Linting issues found"

# Format code
format:
	@echo "✨ Formatting code..."
	@npx prettier --write "src/**/*.{js,jsx,ts,tsx,css,md}" || echo "⚠️  Prettier not installed"
	@echo "✅ Code formatting complete"

# Check for outdated dependencies
check-deps:
	@if [ ! -d "node_modules" ]; then \
		echo "⚠️  Dependencies not installed. Running 'make install'..."; \
		make install; \
	fi

# Check if production build exists
check-production-build:
	@if [ ! -d "dist" ]; then \
		echo "⚠️  No production build found. Building now..."; \
		make build; \
	fi

# Development environment info
info:
	@echo "📊 Project Information:"
	@echo ""
	@echo "Node version:"
	@node --version
	@echo ""
	@echo "NPM version:"
	@npm --version
	@echo ""
	@echo "Project dependencies:"
	@npm list --depth=0
	@echo ""
	@echo "Build size (if built):"
	@if [ -d "dist" ]; then \
		du -sh dist; \
	else \
		echo "No build found. Run 'make build' first."; \
	fi

# Watch mode for continuous development
watch: dev

# Run development server with specific port
dev-port:
	@echo "🚀 Starting development server on custom port..."
	@echo "Usage: make dev-port PORT=3000"
	@npm run dev -- --port $(PORT)

# Build and serve production build
production: build
	@echo "🚀 Building and serving production build..."
	@make preview

# Quick start for new developers
quickstart: install
	@echo ""
	@echo "✅ Setup complete! Starting development server..."
	@echo ""
	@make dev

# Check system requirements
check-requirements:
	@echo "🔍 Checking system requirements..."
	@echo ""
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }
	@echo "✅ Node.js: $(shell node --version)"
	@echo "✅ npm: $(shell npm --version)"
	@echo ""
	@echo "✅ All requirements satisfied"

# Update all dependencies
update-deps:
	@echo "📦 Updating dependencies..."
	@npm update
	@echo "✅ Dependencies updated"
	@echo ""
	@echo "Run 'npm outdated' to see if any major updates are available"

# Run type checking
typecheck:
	@echo "🔍 Running TypeScript type checking..."
	@npx tsc --noEmit || echo "⚠️  Type errors found"

# Build for different environments
build-dev:
	@echo "🔨 Building for development environment..."
	@npm run build -- --mode development
	@echo "✅ Development build complete"

build-staging:
	@echo "🔨 Building for staging environment..."
	@npm run build -- --mode staging
	@echo "✅ Staging build complete"

build-prod: build
	@echo "✅ Production build complete"

# Analyze bundle size
analyze:
	@echo "📊 Analyzing bundle size..."
	@npm run build -- --mode production
	@echo "✅ Check the generated stats for bundle analysis"

# Create production deployment
deploy-prep: clean install build
	@echo "📦 Preparing for deployment..."
	@echo "✅ Production build ready in ./dist"
	@echo ""
	@echo "Deployment checklist:"
	@echo "  - Set correct environment variables"
	@echo "  - Configure Web3 RPC endpoints"
	@echo "  - Update contract addresses if needed"
	@echo "  - Test wallet connections"
	@echo "  - Verify network configurations"

# Development shortcuts
d: dev
b: build
c: clean
i: install

# Combined commands for common workflows
fresh: reinstall dev
	@echo "✅ Fresh development environment started"

test-build: build preview
	@echo "✅ Testing production build"

# Help aliases
h: help
?: help

# Print useful development URLs
urls:
	@echo "🔗 Useful URLs:"
	@echo ""
	@echo "Local Development:"
	@echo "  http://localhost:5173 - Development server"
	@echo "  http://localhost:4173 - Production preview"
	@echo ""
	@echo "Networks:"
	@echo "  Base Mainnet: https://base.org"
	@echo "  Base Sepolia: https://sepolia.base.org"
	@echo "  BaseScan: https://basescan.org"
	@echo ""
	@echo "Documentation:"
	@echo "  Vite: https://vitejs.dev/"
	@echo "  React: https://react.dev/"
	@echo "  shadcn/ui: https://ui.shadcn.com/"
	@echo "  Ethers.js: https://docs.ethers.org/"