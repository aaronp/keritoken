# Contract Artifacts

This directory contains the compiled contract artifacts required for blockchain deployment. 

## Required Setup

The application requires contract artifacts to function. Follow these steps:

### 1. Compile Contracts
```bash
make test
```

### 2. Copy Artifacts
After compilation, copy the contract artifacts to this directory:

```bash
# Copy Governance artifacts
cp artifacts/contracts/GovernanceToken.sol/GovernanceToken.json ui/public/contracts 

# Copy Token artifacts  
cp artifacts/contracts/Token.sol/Token.json ui/public/contracts/ 
```

### 3. Required Files
The following files are needed for real deployment:
- `GovernanceToken.json` - Contains ABI and bytecode for BondToken contract
- `Token.json` - Contains ABI and bytecode for BondAuction contract

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
