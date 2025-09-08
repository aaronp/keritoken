# Makefile Usage Guide

The project includes a comprehensive Makefile for easy development and deployment workflow.

## 🚀 Quick Start

### View all available commands
```bash
make help
```

### Basic development workflow
```bash
# 1. Set up development environment
make dev-setup

# 2. Run basic tests to verify functionality
make test-basic

# 3. Deploy to local network (requires local node)
make deploy-local
```

## 📋 Essential Commands

### Testing
```bash
make test           # Run all tests
make test-basic     # Run basic functionality tests only  
make test-verbose   # Run tests with detailed output
make coverage       # Generate test coverage report
```

### Local Development
```bash
make node           # Start local Hardhat node (keep running)
make deploy-local   # Deploy to local network
make compile        # Compile contracts
make clean          # Clean build artifacts
```

### Deployment
```bash
make deploy-sepolia # Deploy to Base Sepolia testnet
make deploy-base    # Deploy to Base mainnet (production)
```

## 🔄 Common Workflows

### Local Testing Workflow
```bash
# Terminal 1: Start local blockchain
make node

# Terminal 2: Deploy and test
make deploy-local
make test-basic
```

### Testnet Deployment
```bash
# 1. Set up environment
make env-setup
# Edit .env with your private key and API keys

# 2. Run pre-deployment checks
make pre-deploy-check

# 3. Deploy to testnet
make deploy-sepolia
```

### Full Development Cycle
```bash
make dev-cycle      # Compile + test + deploy locally
```

## ⚠️ Important Notes

### Environment Setup
Before deploying to testnets or mainnet:
1. Copy `.env.example` to `.env`
2. Add your private key and API keys
3. Run `make env-check` to verify configuration

### Security Warnings
- The deployment script generates RSA key pairs for bid encryption
- **CRITICAL**: Save the private key output securely - it's needed to decrypt bids
- Never commit private keys to version control
- Use hardware security modules (HSM) for production

### Node.js Version Warnings
You may see warnings about Node.js v23.11.1 not being supported by Hardhat. These can be ignored for development purposes.

## 🎯 Example Session

```bash
# Complete setup and deployment
$ make help
$ make dev-setup
✅ Development environment setup complete!

$ make test-basic
✅ Basic tests passed

$ make node &
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

$ make deploy-local
✅ Deployed to local network
⚠️  IMPORTANT: Save the private key output securely!

# Contracts are now deployed and ready for interaction
```

## 🛠️ Advanced Commands

### Code Quality
```bash
make lint           # Run Solidity linter
make format         # Format code
make gas-report     # Generate gas usage report
```

### Environment Management
```bash
make env-setup      # Create .env from template
make env-check      # Verify environment configuration
```

### Production Deployment
```bash
make pre-deploy-check   # Run pre-deployment checklist
make testnet           # Full testnet deployment workflow
```

## 📝 Contract Addresses

After successful deployment, you'll see output like:
```
=== DEPLOYMENT SUMMARY ===
Network: localhost
BondToken: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
PaymentToken: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
BondAuction: 0x0165878A594ca255338adfa4d48449f69242Eb8F
```

Save these addresses for interacting with the deployed contracts.