# Bond Auction Issuer UI

A React TypeScript application for creating bond tokens and managing encrypted bond auctions. Built with Vite, shadcn/ui, and Web3 integration.

## 🌐 GitHub Pages Deployment

This application is automatically deployed to GitHub Pages when changes are pushed to the main branch.

**Live Demo**: `https://[username].github.io/[repository-name]/`

The deployment includes:
- **Main Application**: Available at root `/`
- **Documentation**: Interactive slides at `/docs/`
- **Landing Page**: Overview at `/landing.html`

See `.github/workflows/deploy-all.yml` for the deployment configuration.

## 🚀 Features

### Bond Token Management
- **Create Bond Tokens**: Deploy new ERC20 bond contracts with custom parameters
- **Bond Configuration**: Set maturity dates, coupon rates, face values, and supply caps
- **Real-time Validation**: Form validation with calculated maturity dates and yields

### Auction Creation
- **Encrypted Bidding**: Create auctions with RSA-encrypted bids for issuer-only visibility
- **Flexible Timeline**: Configure commit, reveal, and claim phases
- **Price Discovery**: Set minimum and maximum bid prices for fair price discovery
- **Pro-rata Allocation**: Automatic fair allocation when demand exceeds supply

### Web3 Integration
- **Wallet Connection**: MetaMask integration with network detection
- **Multi-network Support**: Base Mainnet, Base Sepolia, and local Hardhat networks
- **Contract Deployment**: Direct deployment from the UI with transaction tracking
- **Real-time Updates**: Live feedback on transaction status and contract addresses

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui with Tailwind CSS
- **Web3**: ethers.js v6 for blockchain interactions
- **Wallet**: MetaMask integration (extensible to other wallets)
- **Styling**: Tailwind CSS with custom design system

## 📦 Installation

```bash
# Navigate to the issuer UI directory
cd ui/issuer

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🎯 Usage

### 1. Connect Wallet
- Click "Connect MetaMask" to connect your wallet
- Ensure you're on the correct network (Base Sepolia for testing)
- Make sure you have ETH for gas fees

### 2. Create Bond Token
- Navigate to the "Create Bond" tab
- Fill in bond parameters:
  - Name and symbol
  - Maximum supply
  - Face value and coupon rate
  - Maturity period
- Review the bond summary
- Click "Deploy Bond Token"

### 3. Create Auction
- Navigate to the "Create Auction" tab
- Enter bond token contract address
- Set payment token (USDC) address
- Configure auction parameters:
  - Bond supply to auction
  - Price range (min/max)
  - Timeline (commit/reveal/claim phases)
- Generate encryption keys for bid privacy
- Deploy auction contract

## 🔐 Security Features

### Encrypted Bidding
- **RSA Encryption**: Bids are encrypted with issuer's public key
- **Issuer-only Visibility**: Only the issuer can decrypt and view bid details
- **Commitment Scheme**: Prevents bid manipulation with cryptographic commitments
- **Private Key Management**: Secure storage warnings and best practices

### Access Control
- **Role-based Permissions**: Proper contract role management
- **Wallet Verification**: Transaction signing with connected wallet
- **Network Validation**: Ensures deployment on correct networks

## 📱 User Interface

### Modern Design
- **Responsive Layout**: Works on desktop and mobile devices
- **Dark/Light Mode**: Automatic theme detection
- **Loading States**: Clear feedback during transactions
- **Success/Error Handling**: User-friendly error messages and success confirmations

### Form Validation
- **Real-time Validation**: Immediate feedback on form inputs
- **Required Fields**: Clear indication of mandatory fields
- **Range Validation**: Ensures price ranges and quantities are valid
- **Address Validation**: Checks Ethereum address format

## 🌐 Network Support

### Supported Networks
- **Base Mainnet** (Chain ID: 8453)
- **Base Sepolia** (Chain ID: 84532)
- **Hardhat Local** (Chain ID: 31337)

### Contract Integration
- **USDC Integration**: Built-in support for USDC as payment token
- **Mock Contracts**: MockUSDC for local testing
- **Contract ABIs**: Type-safe contract interactions

## 🔧 Development

### Project Structure
```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── BondCreationForm.tsx
│   ├── AuctionCreationForm.tsx
│   └── WalletConnect.tsx
├── lib/                 # Utility libraries
│   ├── contracts.ts     # Contract interaction utilities
│   └── utils.ts         # shadcn/ui utilities
└── App.tsx             # Main application component
```

### Key Components

#### BondCreationForm
- Form for deploying new bond token contracts
- Real-time calculation of maturity dates and yields
- Validation and success states

#### AuctionCreationForm
- Form for creating encrypted bond auctions
- RSA key pair generation for bid encryption
- Timeline configuration with deadline calculation

#### WalletConnect
- MetaMask wallet connection component
- Network detection and switching
- Address display and management

### Contract Integration
The app integrates with the smart contracts deployed in the parent project:
- `BondToken.sol` - ERC20 bond tokens with metadata
- `BondAuction.sol` - Encrypted bidding auction contract
- `MockUSDC.sol` - Test stablecoin for local development

## ⚠️ Important Notes

### Production Deployment
- Set up proper environment variables for RPC endpoints
- Configure contract addresses for production networks
- Implement proper private key storage for encryption keys
- Set up monitoring for deployed contracts

### Security Considerations
- **Private Key Storage**: The app generates RSA keys for bid encryption - store private keys securely
- **Transaction Validation**: Always verify contract addresses and parameters before deployment
- **Gas Estimation**: Monitor gas prices and transaction costs
- **Network Security**: Ensure you're connecting to legitimate RPC endpoints

## 🚧 Development Status

This UI is ready for testnet deployment and testing. For production use:
- [ ] Implement proper wallet connector (WalletConnect, etc.)
- [ ] Add contract address validation against known deployments
- [ ] Integrate with real-time gas price APIs
- [ ] Add comprehensive error handling and retry logic
- [ ] Implement contract verification integration

## 📞 Support

For issues and questions:
1. Check the parent project documentation in `/docs`
2. Review smart contract tests in `/test`
3. Ensure wallet connection and network configuration
4. Verify contract deployment addresses match your environment