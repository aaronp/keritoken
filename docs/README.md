# Bond Auction Platform Documentation

This directory contains the documentation and presentation slides for the Bond Auction Platform.

## Contents

- `slides.md` - Sli.dev presentation showing the complete user workflow
- Screenshots (`0_*.png` to `12_*.png`) - Step-by-step visual guide
- `package.json` - Dependencies for running the slide presentation

## Screenshots Workflow

The numbered screenshots show the complete user journey:

1. **0_metamask.png** - Initial MetaMask connection
2. **1_connected.png** - Wallet successfully connected
3. **2_createBond.png** - Bond token creation form
4. **3_signDeploy.png** - MetaMask transaction signing
5. **4_deployed.png** - Bond deployment success
6. **5_createAuction.png** - Auction creation form
7. **6_deployAuction.png** - Auction deployment transaction
8. **7_deployed.png** - Auction deployment success  
9. **8_checkLogs.png** - Transaction log verification
10. **9_bidChoice.png** - Auction selection for bidding
11. **10_submitBid.png** - Bid submission form
12. **11_bigSubmitted.png** - Bid submission success
13. **12_explorerViewsBid.png** - Block explorer analysis

## Running the Presentation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Export as PDF
npm run export
```

### Viewing Online
- **Development**: The slides will be available at `http://localhost:3030` when running in development mode
- **Production**: Automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to main/master branch

### GitHub Pages Deployment
This repository includes a GitHub Actions workflow (`.github/workflows/deploy-slides.yml`) that automatically:
- Builds the Slidev presentation when docs are updated
- Deploys to GitHub Pages
- Makes the slides publicly accessible at `https://[username].github.io/[repository-name]/`

## Features Covered

- **Wallet Connection**: MetaMask integration
- **Bond Creation**: ERC-20 token deployment with custom parameters
- **Auction Setup**: Encrypted sealed-bid auction configuration
- **Secure Bidding**: RSA-encrypted bid submission
- **Transaction Explorer**: Event decoding and bid analysis
- **Local Storage**: Contract and bid tracking

## Technical Details

The presentation covers the complete technical stack:

- Smart contracts (Solidity)
- Frontend (React TypeScript) 
- Encryption (RSA-OAEP)
- Local storage integration
- Event log decoding
- Gas estimation and optimization

## Usage Tips

- Use arrow keys or space bar to navigate slides
- Press `f` for fullscreen mode
- Press `o` for overview mode
- Press `?` for help and shortcuts