# Issuer UI Makefile Guide

The Makefile provides convenient commands for building and running the Bond Auction Issuer UI.

## 🚀 Quick Start

```bash
# First time setup
make install

# Start development server
make dev

# Or use the shortcut
make d
```

## 📋 Common Commands

### Development
```bash
make dev          # Start development server (port 5173)
make build        # Build for production
make preview      # Preview production build
make serve        # Alias for 'make dev'
```

### Maintenance
```bash
make clean        # Remove build artifacts and node_modules
make reinstall    # Clean install of all dependencies
make update-deps  # Update all dependencies
```

### Code Quality
```bash
make lint         # Run ESLint
make format       # Format code with Prettier
make typecheck    # Run TypeScript type checking
```

### Shortcuts
```bash
make d            # dev
make b            # build
make c            # clean
make i            # install
```

## 🔧 Advanced Usage

### Custom Port
```bash
make dev-port PORT=3000    # Run dev server on port 3000
```

### Environment Builds
```bash
make build-dev       # Development build
make build-staging   # Staging build
make build-prod      # Production build
```

### Workflows
```bash
make quickstart      # Install deps and start dev server
make fresh           # Clean install and start dev
make test-build      # Build and preview production
make deploy-prep     # Prepare for deployment
```

### Information
```bash
make info            # Show project information
make urls            # Display useful development URLs
make check-deps      # Check if dependencies installed
make check-requirements  # Verify system requirements
```

## 🎯 Common Workflows

### First Time Setup
```bash
git clone <repository>
cd ui/issuer
make quickstart
```

### Daily Development
```bash
make dev             # Start working
# ... make changes ...
make lint            # Check code quality
make build           # Test production build
```

### Before Deployment
```bash
make deploy-prep     # Clean build with checklist
```

### Troubleshooting
```bash
make clean           # Remove all artifacts
make reinstall       # Fresh dependency install
make info            # Check environment
```

## 📌 Tips

1. **Fast Development**: Use `make d` for quick dev server startup
2. **Clean State**: Run `make fresh` if you encounter dependency issues
3. **Production Testing**: Always `make test-build` before deployment
4. **Port Conflicts**: Use `make dev-port PORT=3001` if 5173 is in use

## 🔗 Related Commands

- `npm run dev` - Direct Vite development server
- `npm run build` - Direct production build
- `npm test` - Run tests (when implemented)

The Makefile simplifies these commands and adds helpful features like dependency checking and environment setup.