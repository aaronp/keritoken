import { ethers } from 'ethers'
import { loadBondTokenArtifact, loadBondAuctionArtifact } from './contractArtifacts'

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
      // Load the contract artifact
      console.log('Loading BondToken contract artifact...')
      
      const artifact = await loadBondTokenArtifact()
      
      if (!artifact) {
        throw new Error('Failed to load BondToken artifact')
      }
      
      const { abi, bytecode } = artifact
      
      if (!abi || !bytecode) {
        throw new Error('Invalid contract artifact: missing ABI or bytecode')
      }
      
      if (bytecode === '0x' || !bytecode) {
        throw new Error('Contract bytecode is empty. Please recompile contracts with "make test"')
      }
      
      // Validate parameters
      if (!params.name || !params.symbol) {
        throw new Error('Bond name and symbol are required')
      }
      if (!params.maxSupply || parseFloat(params.maxSupply) <= 0) {
        throw new Error('Max supply must be greater than 0')
      }
      if (!params.faceValue || params.faceValue <= 0) {
        throw new Error('Face value must be greater than 0')
      }
      if (!params.couponRate || params.couponRate < 0) {
        throw new Error('Coupon rate must be 0 or greater')
      }
      if (!params.maturityDate || params.maturityDate <= Math.floor(Date.now() / 1000)) {
        throw new Error('Maturity date must be in the future')
      }

      // Convert parameters to blockchain format
      const maxSupplyWei = ethers.parseEther(params.maxSupply)
      const faceValueWei = ethers.parseEther(params.faceValue.toString())
      const couponRateBps = Math.floor(params.couponRate * 100) // Convert to basis points
      
      console.log('Deploying BondToken with parameters:', {
        name: params.name,
        symbol: params.symbol,
        maxSupply: params.maxSupply,
        maxSupplyWei: maxSupplyWei.toString(),
        maturityDate: params.maturityDate,
        maturityDateReadable: new Date(params.maturityDate * 1000).toLocaleString(),
        faceValue: params.faceValue,
        faceValueWei: faceValueWei.toString(),
        couponRate: params.couponRate,
        couponRateBps: couponRateBps
      })
      
      // Create contract factory and deploy
      const contractFactory = new ethers.ContractFactory(abi, bytecode, this.signer)
      
      // Use a fixed gas limit for now
      const gasLimit = 3000000
      
      console.log('Using gas limit:', gasLimit)

      const contract = await contractFactory.deploy(
        params.name,
        params.symbol,
        maxSupplyWei,
        params.maturityDate,
        faceValueWei,
        couponRateBps,
        {
          gasLimit: gasLimit
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
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Cannot load contract artifacts. Make sure the dev server is running and try refreshing the page.')
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
      // Load the contract artifact
      console.log('Loading BondAuction contract artifact...')
      
      const artifact = await loadBondAuctionArtifact()
      
      if (!artifact) {
        throw new Error('Failed to load BondAuction artifact')
      }
      
      const { abi, bytecode } = artifact
      
      if (!abi || !bytecode) {
        throw new Error('Invalid contract artifact: missing ABI or bytecode')
      }
      
      if (bytecode === '0x' || !bytecode) {
        throw new Error('Contract bytecode is empty. Please recompile contracts with "make test"')
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
        ethers.getBytes(params.issuerPublicKey), // Convert hex string to bytes
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
      throw error
    }
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

  // Utility method to access provider (removes unused warning)
  getProvider(): ethers.Provider {
    return this.provider
  }

  // Get bond token contract instance
  async getBondTokenContract(address: string) {
    if (!this.signer) throw new Error('Signer required for contract interactions')
    const artifact = await loadBondTokenArtifact()
    if (!artifact || !artifact.abi) {
      throw new Error('Failed to load BondToken artifact')
    }
    return new ethers.Contract(address, artifact.abi, this.signer)
  }

  // Get auction contract instance
  async getBondAuctionContract(address: string) {
    if (!this.signer) throw new Error('Signer required for contract interactions')
    
    console.log('Loading BondAuction artifact...')
    const artifact = await loadBondAuctionArtifact()
    if (!artifact) {
      throw new Error('BondAuction artifact is null or undefined')
    }
    if (!artifact.abi) {
      throw new Error('BondAuction artifact missing ABI')
    }
    
    console.log('Creating contract instance with ABI length:', artifact.abi.length)
    console.log('ABI structure sample:', artifact.abi.slice(0, 3))
    
    // Check if ABI has function entries
    const functionEntries = artifact.abi.filter(entry => entry.type === 'function')
    console.log('Function entries in ABI:', functionEntries.length)
    console.log('Function names:', functionEntries.map(f => f.name).slice(0, 5))
    
    const contract = new ethers.Contract(address, artifact.abi, this.signer)
    
    if (!contract.interface) {
      throw new Error('Failed to create contract interface from ABI')
    }
    
    console.log('Contract instance created successfully')
    console.log('Contract interface type:', typeof contract.interface)
    console.log('Interface constructor name:', contract.interface.constructor.name)
    
    return contract
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
      // Use simple local explorer
      return `/explorer.html?tx=${txHash}` // Simple HTML explorer
    default:
      return `#`
  }
}