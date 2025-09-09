# Contract Artifacts

This directory contains the compiled contract artifacts required for blockchain deployment. 

## Required Setup

The application requires contract artifacts to function. Follow these steps:

### 1. Compile Contracts
```bash
# From the root directory (/Users/aaron/dev/sandbox/auctions/)
make test
```

### 2. Copy Artifacts
After compilation, copy the contract artifacts to this directory:

```bash
# Copy BondToken artifacts
cp artifacts/contracts/BondToken.sol/BondToken.json ui/issuer/public/contracts/

# Copy BondAuction artifacts  
cp artifacts/contracts/BondAuction.sol/BondAuction.json ui/issuer/public/contracts/
```

### 3. Required Files
The following files are needed for real deployment:
- `BondToken.json` - Contains ABI and bytecode for BondToken contract
- `BondAuction.json` - Contains ABI and bytecode for BondAuction contract

### 4. File Structure
Each JSON file should have this structure:
```json
{
  "abi": [...],
  "bytecode": "0x608060405234801561001057600080fd5b50...",
  "contractName": "BondToken",
  "sourceName": "contracts/BondToken.sol"
}
```

## How It Works

The application performs real blockchain deployments on:
- **Local Network** (Hardhat): chainId 31337
- **Base Sepolia** (Testnet): chainId 84532  
- **Base Mainnet** (Production): chainId 8453

### Features:
- ✅ Real contract deployment to blockchain
- ✅ Actual transaction hashes and receipts
- ✅ Real contract addresses
- ✅ Full MetaMask integration
- ✅ Block explorer integration
- ✅ Gas estimation and transaction monitoring

## Error Messages

Common deployment errors and solutions:

- `"Failed to load BondToken artifacts: 404 Not Found"` - Contract artifacts missing from public/contracts/
- `"Contract artifacts not found"` - Run `make test` and copy artifacts  
- `"Contract bytecode is empty"` - Recompile contracts with `make clean && make test`
- `"Insufficient funds for deployment"` - Add ETH to your wallet for gas fees
- `"User rejected transaction"` - Transaction was cancelled in MetaMask

## Networks Supported

The deployment system supports:
- **Base Sepolia** (chainId: 84532) - Testnet
- **Base Mainnet** (chainId: 8453) - Production  
- **Hardhat Local** (chainId: 31337) - Local development

## Gas Requirements

Make sure your wallet has sufficient ETH for gas fees:
- **BondToken deployment**: ~0.01-0.02 ETH
- **BondAuction deployment**: ~0.015-0.025 ETH

## Troubleshooting

1. **"Artifacts not found"**: Run `make test` and copy artifacts
2. **"Invalid JSON"**: Check file format and syntax
3. **"Bytecode empty"**: Recompile contracts with `make clean && make test`
4. **"Deployment failed"**: Check wallet connection and gas fees

## Quick Setup Script

```bash
#!/bin/bash
# Run from project root
echo "Compiling contracts..."
make test

echo "Copying artifacts..."
mkdir -p ui/issuer/public/contracts
cp artifacts/contracts/BondToken.sol/BondToken.json ui/issuer/public/contracts/
cp artifacts/contracts/BondAuction.sol/BondAuction.json ui/issuer/public/contracts/

echo "✅ Contract artifacts ready for deployment!"
echo "💡 Now you can use real blockchain deployment in the UI"
```