import { ethers } from 'ethers'

// Contract ABIs - These would typically be imported from your compiled contracts
export const BOND_TOKEN_ABI = [
  "constructor(string name, string symbol, uint256 _maxSupply, uint256 _maturityDate, uint256 _faceValue, uint256 _couponRate)",
  "function mint(address to, uint256 amount) public",
  "function name() public view returns (string)",
  "function symbol() public view returns (string)", 
  "function totalSupply() public view returns (uint256)",
  "function cap() public view returns (uint256)",
  "function maturityDate() public view returns (uint256)",
  "function faceValue() public view returns (uint256)",
  "function couponRate() public view returns (uint256)",
  "function grantRole(bytes32 role, address account) public",
  "function MINTER_ROLE() public view returns (bytes32)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
]

export const BOND_AUCTION_ABI = [
  "constructor(address _bondToken, address _paymentToken, uint256 _bondSupply, uint256 _minPrice, uint256 _maxPrice, uint256 _commitDuration, uint256 _revealDuration, uint256 _claimDuration, bytes _issuerPublicKey)",
  "function bondSupply() public view returns (uint256)",
  "function minPrice() public view returns (uint256)",
  "function maxPrice() public view returns (uint256)",
  "function commitDeadline() public view returns (uint256)",
  "function revealDeadline() public view returns (uint256)",
  "function claimDeadline() public view returns (uint256)",
  "function issuerPublicKey() public view returns (bytes)",
  "function commitBid(bytes32 commitment, bytes encryptedBid) external",
  "function revealBid(uint256 price, uint256 quantity, uint256 salt) external",
  "function finalize() external",
  "function claimTokens() external",
  "event BidCommitted(address indexed bidder, bytes32 commitment, bytes encryptedBid)",
  "event BidRevealed(address indexed bidder, uint256 price, uint256 quantity)",
  "event AuctionFinalized(uint256 clearingPrice, uint256 totalAllocated)"
]

export const MOCK_USDC_ABI = [
  "constructor()",
  "function mint(address to, uint256 amount) external",
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function decimals() public view returns (uint8)",
  "function totalSupply() public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)",
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)"
]

// Real contract deployment functions
export class ContractDeployer {
  private signer: ethers.Signer
  
  constructor(signer: ethers.Signer) {
    this.signer = signer
  }

  async deployBondToken(params: {
    name: string
    symbol: string
    maxSupply: string
    maturityDate: number
    faceValue: number
    couponRate: number
  }) {
    try {
      // Get the bytecode from the parent project's artifacts
      const response = await fetch('/contracts/BondToken.json')
      
      if (!response.ok) {
        throw new Error('ARTIFACTS_NOT_FOUND')
      }
      
      const text = await response.text()
      
      // Check if we got HTML instead of JSON (404 page)
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('ARTIFACTS_NOT_FOUND')
      }
      
      let artifact
      try {
        artifact = JSON.parse(text)
      } catch (parseError) {
        throw new Error('ARTIFACTS_INVALID')
      }
      
      const { abi, bytecode } = artifact
      
      if (!bytecode || bytecode === '0x') {
        throw new Error('ARTIFACTS_EMPTY')
      }
      
      // Convert parameters to blockchain format
      const maxSupplyWei = ethers.parseEther(params.maxSupply)
      const faceValueWei = ethers.parseEther(params.faceValue.toString())
      const couponRateBps = Math.floor(params.couponRate * 100) // Convert to basis points
      
      console.log('Deploying BondToken with parameters:', {
        name: params.name,
        symbol: params.symbol,
        maxSupply: maxSupplyWei.toString(),
        maturityDate: params.maturityDate,
        faceValue: faceValueWei.toString(),
        couponRate: couponRateBps
      })
      
      // Create contract factory and deploy
      const contractFactory = new ethers.ContractFactory(abi, bytecode, this.signer)
      
      const contract = await contractFactory.deploy(
        params.name,
        params.symbol,
        maxSupplyWei,
        params.maturityDate,
        faceValueWei,
        couponRateBps,
        {
          gasLimit: 3000000 // Generous gas limit
        }
      )
      
      console.log('Contract deployment initiated. Transaction hash:', contract.deploymentTransaction()?.hash)
      
      // Wait for deployment to complete
      await contract.waitForDeployment()
      const deploymentTx = contract.deploymentTransaction()
      const receipt = await deploymentTx?.wait()
      
      if (!receipt) {
        throw new Error('Deployment transaction failed')
      }
      
      const contractAddress = await contract.getAddress()
      
      console.log('BondToken deployed successfully:', {
        address: contractAddress,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      })
      
      return {
        address: contractAddress,
        transactionHash: receipt.hash,
        name: params.name,
        symbol: params.symbol,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }
    } catch (error) {
      console.error('Bond token deployment failed:', error)
      
      // Fall back to simulation if artifacts are missing (for development)
      if (error instanceof Error && (
        error.message === 'ARTIFACTS_NOT_FOUND' || 
        error.message === 'ARTIFACTS_INVALID' ||
        error.message === 'ARTIFACTS_EMPTY'
      )) {
        console.warn('Contract artifacts not available. Falling back to simulated deployment for development.')
        console.warn('To use real deployment: 1) Run "make test" in parent directory, 2) Copy artifacts to public/contracts/')
        return this.simulateBondTokenDeployment(params)
      }
      
      throw error
    }
  }

  async deployBondAuction(params: {
    bondTokenAddress: string
    paymentTokenAddress: string
    bondSupply: string
    minPrice: string
    maxPrice: string
    commitDuration: number
    revealDuration: number
    claimDuration: number
    issuerPublicKey: string
  }) {
    try {
      // Get the bytecode from the parent project's artifacts
      const response = await fetch('/contracts/BondAuction.json')
      
      if (!response.ok) {
        throw new Error('ARTIFACTS_NOT_FOUND')
      }
      
      const text = await response.text()
      
      // Check if we got HTML instead of JSON (404 page)
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('ARTIFACTS_NOT_FOUND')
      }
      
      let artifact
      try {
        artifact = JSON.parse(text)
      } catch (parseError) {
        throw new Error('ARTIFACTS_INVALID')
      }
      
      const { abi, bytecode } = artifact
      
      if (!bytecode || bytecode === '0x') {
        throw new Error('ARTIFACTS_EMPTY')
      }
      
      // Convert parameters to blockchain format
      const bondSupplyWei = ethers.parseEther(params.bondSupply)
      const minPriceWei = ethers.parseEther(params.minPrice)
      const maxPriceWei = ethers.parseEther(params.maxPrice)
      
      // Calculate deadlines from current time
      const now = Math.floor(Date.now() / 1000)
      const commitDeadline = now + (params.commitDuration * 24 * 60 * 60) // Convert days to seconds
      const revealDeadline = commitDeadline + (params.revealDuration * 24 * 60 * 60)
      const claimDeadline = revealDeadline + (params.claimDuration * 24 * 60 * 60)
      
      console.log('Deploying BondAuction with parameters:', {
        bondToken: params.bondTokenAddress,
        paymentToken: params.paymentTokenAddress,
        bondSupply: bondSupplyWei.toString(),
        minPrice: minPriceWei.toString(),
        maxPrice: maxPriceWei.toString(),
        commitDeadline,
        revealDeadline,
        claimDeadline,
        issuerPublicKey: params.issuerPublicKey
      })
      
      // Create contract factory and deploy
      const contractFactory = new ethers.ContractFactory(abi, bytecode, this.signer)
      
      const contract = await contractFactory.deploy(
        params.bondTokenAddress,
        params.paymentTokenAddress,
        bondSupplyWei,
        minPriceWei,
        maxPriceWei,
        commitDeadline,
        revealDeadline,
        claimDeadline,
        ethers.toUtf8Bytes(params.issuerPublicKey), // Convert string to bytes
        {
          gasLimit: 4000000 // Generous gas limit for auction contract
        }
      )
      
      console.log('Auction deployment initiated. Transaction hash:', contract.deploymentTransaction()?.hash)
      
      // Wait for deployment to complete
      await contract.waitForDeployment()
      const deploymentTx = contract.deploymentTransaction()
      const receipt = await deploymentTx?.wait()
      
      if (!receipt) {
        throw new Error('Deployment transaction failed')
      }
      
      const contractAddress = await contract.getAddress()
      
      console.log('BondAuction deployed successfully:', {
        address: contractAddress,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      })
      
      return {
        address: contractAddress,
        transactionHash: receipt.hash,
        bondSupply: params.bondSupply,
        priceRange: `${params.minPrice} - ${params.maxPrice}`,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }
    } catch (error) {
      console.error('Bond auction deployment failed:', error)
      
      // Fall back to simulation if artifacts are missing (for development)
      if (error instanceof Error && (
        error.message === 'ARTIFACTS_NOT_FOUND' || 
        error.message === 'ARTIFACTS_INVALID' ||
        error.message === 'ARTIFACTS_EMPTY'
      )) {
        console.warn('Contract artifacts not available. Falling back to simulated deployment for development.')
        console.warn('To use real deployment: 1) Run "make test" in parent directory, 2) Copy artifacts to public/contracts/')
        return this.simulateBondAuctionDeployment(params)
      }
      
      throw error
    }
  }

  // Fallback simulation methods for development
  private async simulateBondTokenDeployment(params: {
    name: string
    symbol: string
    maxSupply: string
    maturityDate: number
    faceValue: number
    couponRate: number
  }) {
    await this.simulateTransaction()
    
    const mockAddress = '0x' + Math.random().toString(16).substring(2, 42).padStart(40, '0')
    
    return {
      address: mockAddress,
      transactionHash: '0x' + Math.random().toString(16).substring(2, 66),
      name: params.name,
      symbol: params.symbol,
      blockNumber: Math.floor(Math.random() * 1000000),
      gasUsed: '2500000',
      isSimulated: true
    }
  }

  private async simulateBondAuctionDeployment(params: {
    bondTokenAddress: string
    paymentTokenAddress: string
    bondSupply: string
    minPrice: string
    maxPrice: string
    commitDuration: number
    revealDuration: number
    claimDuration: number
    issuerPublicKey: string
  }) {
    await this.simulateTransaction()
    
    const mockAddress = '0x' + Math.random().toString(16).substring(2, 42).padStart(40, '0')
    
    return {
      address: mockAddress,
      transactionHash: '0x' + Math.random().toString(16).substring(2, 66),
      bondSupply: params.bondSupply,
      priceRange: `${params.minPrice} - ${params.maxPrice}`,
      blockNumber: Math.floor(Math.random() * 1000000),
      gasUsed: '3500000',
      isSimulated: true
    }
  }

  private simulateTransaction(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 2000 + Math.random() * 2000) // 2-4 second delay
    })
  }
}

// Contract interaction utilities
export class ContractInteractor {
  private provider: ethers.Provider
  private signer?: ethers.Signer

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider
    this.signer = signer
  }

  // Get bond token contract instance
  getBondTokenContract(address: string) {
    if (!this.signer) throw new Error('Signer required for contract interactions')
    return new ethers.Contract(address, BOND_TOKEN_ABI, this.signer)
  }

  // Get auction contract instance
  getBondAuctionContract(address: string) {
    if (!this.signer) throw new Error('Signer required for contract interactions')
    return new ethers.Contract(address, BOND_AUCTION_ABI, this.signer)
  }

  // Get USDC contract instance
  getUSDCContract(address: string) {
    if (!this.signer) throw new Error('Signer required for contract interactions')
    return new ethers.Contract(address, MOCK_USDC_ABI, this.signer)
  }

  // Helper function to format ethers values
  static formatEther(value: bigint): string {
    return ethers.formatEther(value)
  }

  static parseEther(value: string): bigint {
    return ethers.parseEther(value)
  }

  static formatUnits(value: bigint, decimals: number): string {
    return ethers.formatUnits(value, decimals)
  }

  static parseUnits(value: string, decimals: number): bigint {
    return ethers.parseUnits(value, decimals)
  }
}

// Network configuration
export const NETWORKS = {
  LOCAL: {
    chainId: 31337,
    name: 'Hardhat Local',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: null
  },
  BASE_SEPOLIA: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org'
  },
  BASE_MAINNET: {
    chainId: 8453,
    name: 'Base Mainnet', 
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org'
  }
}

// Known contract addresses for different networks
export const KNOWN_CONTRACTS = {
  USDC: {
    [NETWORKS.BASE_MAINNET.chainId]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    [NETWORKS.BASE_SEPOLIA.chainId]: '0x...' // Would need actual Base Sepolia USDC address
  },
  MOCK_USDC: {
    [NETWORKS.LOCAL.chainId]: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' // Example local address
  }
}

// Utility functions
export const getNetworkById = (chainId: number) => {
  return Object.values(NETWORKS).find(network => network.chainId === chainId)
}

export const isValidAddress = (address: string): boolean => {
  return ethers.isAddress(address)
}

export const shortenAddress = (address: string): string => {
  if (!isValidAddress(address)) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Get provider and signer from MetaMask
export const getProviderAndSigner = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to deploy contracts.')
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const network = await provider.getNetwork()
  
  return {
    provider,
    signer,
    chainId: Number(network.chainId)
  }
}

// Get block explorer URL for transaction
export const getBlockExplorerUrl = (chainId: number, txHash: string): string => {
  switch (chainId) {
    case 1:
      return `https://etherscan.io/tx/${txHash}`
    case 8453:
      return `https://basescan.org/tx/${txHash}`
    case 84532:
      return `https://sepolia.basescan.org/tx/${txHash}`
    case 31337:
      return `#` // No explorer for local network
    default:
      return `#`
  }
}