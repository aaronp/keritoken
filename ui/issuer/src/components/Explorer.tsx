import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Search, AlertCircle, Coins, Gavel, Lock } from 'lucide-react'
import { ethers } from 'ethers'
import { getBlockExplorerUrl, BOND_TOKEN_ABI, BOND_AUCTION_ABI, MOCK_USDC_ABI } from '@/lib/contracts'
import { useBondTokens, useAuctions, useBids } from '@/hooks/useAppState'
import { getAuctionPrivateKey, getAllTransactions, type TransactionRecord } from '@/lib/storage'

interface TransactionResult {
  tx: ethers.TransactionResponse
  receipt: ethers.TransactionReceipt | null
  block: ethers.Block | null
}


interface DecodedEvent {
  name: string
  signature: string
  args: Record<string, any>
  contractType: 'BondToken' | 'BondAuction' | 'USDC' | 'Unknown'
  icon: React.ComponentType<any>
  description: string
  color: string
  contractInfo?: {
    name?: string
    symbol?: string
    bondTokenName?: string
  }
}

interface ContractInfo {
  address: string
  type: 'BondToken' | 'BondAuction' | 'USDC'
  name?: string
  symbol?: string
  bondTokenName?: string
  abi: any[]
}

export function Explorer() {
  const [txHash, setTxHash] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TransactionResult | null>(null)
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null)

  // Load local storage data for contract identification
  const { bonds } = useBondTokens() // Get all bonds across all chains
  const { auctions } = useAuctions() // Get all auctions across all chains
  const { getBidByTransactionHash } = useBids() // Get bid data

  // Get all transactions for dropdown
  const [allTransactions, setAllTransactions] = useState<TransactionRecord[]>([])

  useEffect(() => {
    setAllTransactions(getAllTransactions())
  }, [bonds, auctions]) // Refresh when contracts change

  // Contract interfaces for event decoding
  const bondTokenInterface = new ethers.Interface(BOND_TOKEN_ABI)
  const bondAuctionInterface = new ethers.Interface(BOND_AUCTION_ABI)
  const mockUSDCInterface = new ethers.Interface(MOCK_USDC_ABI)

  // Function to identify contracts from local storage
  const identifyContract = (address: string): ContractInfo | null => {
    // Normalize address for comparison
    const normalizedAddress = address.toLowerCase()

    // Check if it's a known bond token
    const bondToken = bonds.find(bond => bond.address.toLowerCase() === normalizedAddress)
    if (bondToken) {
      return {
        address,
        type: 'BondToken',
        name: bondToken.name,
        symbol: bondToken.symbol,
        abi: BOND_TOKEN_ABI
      }
    }

    // Check if it's a known auction contract
    const auction = auctions.find(auction => auction.address.toLowerCase() === normalizedAddress)
    if (auction) {
      return {
        address,
        type: 'BondAuction',
        bondTokenName: auction.bondTokenName,
        abi: BOND_AUCTION_ABI
      }
    }

    // Check if it's a payment token (USDC) from auction data
    const paymentToken = auctions.find(auction => auction.paymentTokenAddress.toLowerCase() === normalizedAddress)
    if (paymentToken) {
      return {
        address,
        type: 'USDC',
        name: 'Mock USDC',
        symbol: 'USDC',
        abi: MOCK_USDC_ABI
      }
    }

    return null
  }

  // Function to decode event logs
  const decodeEventLog = (log: ethers.Log): DecodedEvent | null => {
    // First, try to identify the contract from local storage
    const contractInfo = identifyContract(log.address)

    if (contractInfo) {
      // Use the specific ABI for this known contract
      try {
        const contractInterface = new ethers.Interface(contractInfo.abi)
        const decodedLog = contractInterface.parseLog(log)
        if (decodedLog) {
          return {
            name: decodedLog.name,
            signature: decodedLog.signature,
            args: decodedLog.args.toObject(),
            contractType: contractInfo.type,
            contractInfo: {
              name: contractInfo.name,
              symbol: contractInfo.symbol,
              bondTokenName: contractInfo.bondTokenName
            },
            ...getEventMetadata(decodedLog.name)
          }
        }
      } catch (error) {
        console.warn(`Failed to decode event for known contract ${contractInfo.type}:`, error)
      }
    }

    // Fallback to trying all interfaces if contract not identified
    const interfaces = [
      { interface: bondTokenInterface, type: 'BondToken' as const },
      { interface: bondAuctionInterface, type: 'BondAuction' as const },
      { interface: mockUSDCInterface, type: 'USDC' as const }
    ]

    for (const { interface: contractInterface, type } of interfaces) {
      try {
        const decodedLog = contractInterface.parseLog(log)
        if (decodedLog) {
          return {
            name: decodedLog.name,
            signature: decodedLog.signature,
            args: decodedLog.args.toObject(),
            contractType: type,
            ...getEventMetadata(decodedLog.name)
          }
        }
      } catch (error) {
        // Log parsing failed, continue to next interface
        continue
      }
    }

    return null
  }

  // Get event metadata for better display
  const getEventMetadata = (eventName: string) => {
    const eventMetadata: Record<string, { icon: React.ComponentType<any>, description: string, color: string }> = {
      'Transfer': {
        icon: Coins,
        description: 'Token transfer between addresses',
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      'BidCommitted': {
        icon: Lock,
        description: 'Encrypted bid submitted to auction',
        color: 'bg-green-100 text-green-800 border-green-200'
      },
      'BidRevealed': {
        icon: Search,
        description: 'Bid details revealed during reveal phase',
        color: 'bg-purple-100 text-purple-800 border-purple-200'
      },
      'AuctionFinalized': {
        icon: Gavel,
        description: 'Auction completed with clearing price set',
        color: 'bg-orange-100 text-orange-800 border-orange-200'
      },
      'TokensClaimed': {
        icon: Coins,
        description: 'Auction winner claimed their tokens',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
      },
      'RoleGranted': {
        icon: Lock,
        description: 'Access control role granted',
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
      },
      'Approval': {
        icon: Lock,
        description: 'Token approval granted',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      'OwnershipTransferred': {
        icon: Lock,
        description: 'Contract ownership transferred',
        color: 'bg-red-100 text-red-800 border-red-200'
      }
    }

    return eventMetadata[eventName] || {
      icon: AlertCircle,
      description: 'Unknown event type',
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Function to decrypt bid using private key
  const decryptBid = async (encryptedBidHex: string, privateKeyHex: string): Promise<any> => {
    try {
      // Convert hex strings to buffers
      const encryptedData = new Uint8Array(
        encryptedBidHex.slice(2).match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      )
      const privateKeyData = new Uint8Array(
        privateKeyHex.slice(2).match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      )

      // Import private key for decryption
      const privateKey = await window.crypto.subtle.importKey(
        "pkcs8",
        privateKeyData,
        {
          name: "RSA-OAEP",
          hash: "SHA-256"
        },
        false,
        ["decrypt"]
      )

      // Decrypt the data
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP"
        },
        privateKey,
        encryptedData
      )

      // Convert to string and parse JSON
      const decryptedText = new TextDecoder().decode(decryptedBuffer)
      return JSON.parse(decryptedText)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt bid data')
    }
  }

  // Format event arguments for display
  const formatEventArg = (key: string, value: any, eventName: string): React.ReactNode => {
    try {
      // Handle different value types
      if (typeof value === 'bigint') {
        // Check if it looks like a wei amount (common in our contracts)
        if (key.toLowerCase().includes('price') || key.toLowerCase().includes('value') || key.toLowerCase().includes('amount')) {
          if (key.toLowerCase().includes('price') && eventName === 'BidRevealed') {
            // Prices in auction are in USDC units (6 decimals)
            return `$${ethers.formatUnits(value, 6)}`
          } else if (key.toLowerCase().includes('quantity') && eventName === 'BidRevealed') {
            // Quantities are in ether units (18 decimals)
            return `${ethers.formatEther(value)} bonds`
          } else if (key.toLowerCase().includes('price')) {
            // Generic price formatting
            return `$${ethers.formatUnits(value, 6)}`
          } else {
            // Default to ether formatting for amounts
            return `${ethers.formatEther(value)} tokens`
          }
        } else {
          // Just show the number for other BigInt values
          return value.toString()
        }
      } else if (typeof value === 'string' && value.startsWith('0x')) {
        // Special handling for important fields that shouldn't be truncated
        const isImportantField = key.toLowerCase().includes('encryptedbid') ||
          key.toLowerCase().includes('encrypted') ||
          key.toLowerCase().includes('data')

        // Handle addresses and hashes
        if (value.length === 42) {
          // Ethereum address
          return (
            <div className="space-y-1">
              <span className="bg-muted px-2 py-1 rounded font-mono text-xs">
                {value.slice(0, 6)}...{value.slice(-4)}
              </span>
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  Show full address
                </summary>
                <div className="mt-1 p-2 bg-muted rounded font-mono text-xs break-all text-foreground">
                  {value}
                </div>
              </details>
            </div>
          )
        } else if (value.length === 66) {
          // Hash (like commitment)
          return (
            <div className="space-y-1">
              <span className="bg-muted px-2 py-1 rounded font-mono text-xs">
                {value.slice(0, 10)}...{value.slice(-6)}
              </span>
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  Show full hash
                </summary>
                <div className="mt-1 p-2 bg-muted rounded font-mono text-xs break-all text-foreground">
                  {value}
                </div>
              </details>
            </div>
          )
        } else if (isImportantField) {
          // Don't truncate important fields like encrypted bid data
          const previewLength = 30
          return (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="bg-muted px-2 py-1 rounded font-mono text-xs">
                  {value.length > previewLength ? `${value.slice(0, previewLength)}...` : value}
                </span>
                <Badge variant="outline" className="text-xs">
                  {value.length} chars
                </Badge>
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  Show full encrypted data
                </summary>
                <div className="mt-2 p-3 bg-muted rounded border">
                  <div className="font-mono text-xs break-all leading-relaxed text-foreground">
                    {value}
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-6"
                      onClick={() => navigator.clipboard.writeText(value)}
                    >
                      Copy
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Length: {value.length} characters
                    </span>
                  </div>
                </div>
              </details>
            </div>
          )
        } else {
          // Other hex data - show with expandable option
          return (
            <div className="space-y-1">
              <span className="bg-muted px-2 py-1 rounded font-mono text-xs">
                {value.length > 20 ? `${value.slice(0, 20)}...` : value}
              </span>
              {value.length > 20 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    Show full data
                  </summary>
                  <div className="mt-1 p-2 bg-gray-100 rounded font-mono text-xs break-all">
                    {value}
                  </div>
                </details>
              )}
            </div>
          )
        }
      } else {
        // Default string representation
        return String(value)
      }
    } catch (error) {
      return String(value)
    }
  }

  // Component for bid reveal functionality
  const BidRevealButton = ({ log, decodedEvent }: { log: ethers.Log, decodedEvent: DecodedEvent }) => {
    const [isRevealing, setIsRevealing] = useState(false)
    const [revealedBid, setRevealedBid] = useState<any>(null)
    const [revealError, setRevealError] = useState<string>('')

    // Check if this is a BidCommitted event with encrypted bid data
    if (decodedEvent.name !== 'BidCommitted' || !decodedEvent.args.encryptedBid) {
      return null
    }

    // Get the stored bid data and private key
    const bidData = getBidByTransactionHash(result?.tx.hash || '')
    const privateKey = getAuctionPrivateKey(log.address)

    // Only show if we have the private key for this auction
    if (!privateKey) {
      return null
    }

    const handleRevealBid = async () => {
      if (!bidData) {
        setRevealError('Bid data not found in local storage')
        return
      }

      setIsRevealing(true)
      setRevealError('')

      try {
        const decryptedBid = await decryptBid(decodedEvent.args.encryptedBid, privateKey)
        setRevealedBid(decryptedBid)
      } catch (error) {
        console.error('Failed to reveal bid:', error)
        setRevealError('Failed to decrypt bid data')
      } finally {
        setIsRevealing(false)
      }
    }

    return (
      <div className="mt-3 space-y-3">
        {!revealedBid && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRevealBid}
            disabled={isRevealing}
            className="flex items-center space-x-2"
          >
            <Lock className="h-3 w-3" />
            <span>{isRevealing ? 'Revealing...' : 'Reveal Bid'}</span>
          </Button>
        )}

        {revealError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            {revealError}
          </div>
        )}

        {revealedBid && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 text-sm flex items-center space-x-2">
                <Lock className="h-4 w-4" />
                <span>🔓 Decrypted Bid Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-gray-900">
              {formatProperty('Bid Price', `$${revealedBid.price}`)}
              {formatProperty('Quantity', `${revealedBid.quantity} bonds`)}
              {formatProperty('Salt', revealedBid.salt?.toString())}
              {formatProperty('Bidder',
                <span className="bg-muted px-2 py-1 rounded font-mono text-foreground">
                  {revealedBid.bidder?.slice(0, 8)}...{revealedBid.bidder?.slice(-6)}
                </span>
              )}
              {formatProperty('Timestamp',
                revealedBid.timestamp ? new Date(revealedBid.timestamp).toLocaleString() : 'N/A'
              )}
              {formatProperty('Total Value',
                `$${(parseFloat(revealedBid.price) * parseFloat(revealedBid.quantity)).toLocaleString()}`
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Initialize provider on component mount
  useEffect(() => {
    try {
      const ethersProvider = new ethers.JsonRpcProvider('http://localhost:8545')
      setProvider(ethersProvider)
      console.log('Provider initialized successfully')
    } catch (err) {
      console.error('Failed to initialize provider:', err)
      setError('Failed to initialize provider. Make sure local node is running.')
    }
  }, [])

  // Auto-fill from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const txParam = urlParams.get('tx')
    if (txParam) {
      setTxHash(txParam)
      // Auto-search if URL has tx parameter
      if (provider) {
        handleSearch()
      }
    }
  }, [provider])

  const handleSearch = async () => {
    if (!provider) {
      setError('Provider not initialized. Please wait for the page to fully load.')
      return
    }

    if (!txHash.trim()) {
      setError('Please enter a transaction hash')
      return
    }

    if (!txHash.startsWith('0x') || txHash.length !== 66) {
      setError('Invalid transaction hash format. Should be 0x followed by 64 hex characters.')
      return
    }

    setIsLoading(true)
    setError('')
    setResult(null)

    try {
      console.log('Looking up transaction:', txHash)

      const tx = await provider.getTransaction(txHash)
      if (!tx) {
        setError('Transaction not found')
        return
      }

      const receipt = await provider.getTransactionReceipt(txHash)
      const block = tx.blockHash ? await provider.getBlock(tx.blockHash) : null

      setResult({ tx, receipt, block })

    } catch (err) {
      console.error('Lookup error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Error: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatProperty = (name: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[200px_1fr] gap-4 py-3 border-b border-border last:border-b-0">
      <div className="text-sm font-medium text-foreground/70 uppercase tracking-wide">
        {name}
      </div>
      <div className="font-mono text-sm break-all">
        {value}
      </div>
    </div>
  )

  const getStatusBadge = (receipt: ethers.TransactionReceipt | null) => {
    if (!receipt) {
      return <Badge variant="secondary">⏳ Pending</Badge>
    }
    return receipt.status === 1
      ? <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">✅ Success</Badge>
      : <Badge variant="destructive">❌ Failed</Badge>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search Transaction</CardTitle>
            <CardDescription>
              Choose from your transactions or enter a hash manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {allTransactions.length > 0 && (
              <div className="space-y-2">
                <Label>Your Transactions</Label>
                <Select onValueChange={(value) => setTxHash(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from your transaction history" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTransactions.map((tx) => {
                      const getTypeIcon = (type: string) => {
                        switch (type) {
                          case 'bond': return '🏛️'
                          case 'auction': return '🔨'
                          case 'bid': return '💰'
                          default: return '📝'
                        }
                      }

                      const getTypeBadge = (type: string) => {
                        switch (type) {
                          case 'bond': return 'Bond Creation'
                          case 'auction': return 'Auction Deploy'
                          case 'bid': return 'Bid Submitted'
                          default: return 'Transaction'
                        }
                      }

                      return (
                        <SelectItem key={tx.hash} value={tx.hash}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{getTypeIcon(tx.type)}</span>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{tx.description}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {getTypeBadge(tx.type)}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)} • {new Date(tx.timestamp).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Or Enter Transaction Hash</Label>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter transaction hash (0x...)"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="font-mono"
                />
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !txHash}
                  className="px-8"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>

            {allTransactions.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No transactions found in local storage.</p>
                <p className="text-xs mt-1">Deploy bonds, create auctions, or submit bids to see them here.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive/20 bg-destructive/5 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="mb-8">
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-foreground text-lg">🔄 Searching for transaction...</p>
            </CardContent>
          </Card>
        )}

        {/* Transaction Results */}
        {result && (
          <div className="space-y-6">
            {/* Contract Summary */}
            {result.receipt && result.receipt.logs && result.receipt.logs.length > 0 && (() => {
              const uniqueContracts = new Map<string, ContractInfo | null>()
              result.receipt.logs.forEach(log => {
                if (!uniqueContracts.has(log.address)) {
                  uniqueContracts.set(log.address, identifyContract(log.address))
                }
              })

              const knownContracts = Array.from(uniqueContracts.entries()).filter(([_, info]) => info !== null)

              return knownContracts.length > 0 ? (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-800 flex items-center space-x-2">
                      <Search className="h-5 w-5" />
                      <span>Known Contracts in Transaction</span>
                    </CardTitle>
                    <CardDescription className="text-green-800">
                      These contracts are recognized from your local deployment history
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {knownContracts.map(([address, info]) => (
                        <div key={address} className="bg-white p-3 rounded border border-green-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline" className="text-xs border-green-300 text-green-800">
                              {info!.type}
                            </Badge>
                            {info!.name && (
                              <span className="font-medium text-sm text-gray-900">
                                {info!.symbol ? `${info!.name} (${info!.symbol})` : info!.name}
                              </span>
                            )}
                            {info!.bondTokenName && (
                              <span className="text-xs text-muted-foreground">
                                for {info!.bondTokenName}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono bg-muted text-foreground px-2 py-1 rounded">
                            {address.slice(0, 8)}...{address.slice(-6)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null
            })()}
            {/* Transaction Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    📋 <span>Transaction Details</span>
                  </span>
                  {getStatusBadge(result.receipt)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {formatProperty('Hash', <span className="bg-muted px-2 py-1 rounded text-primary font-medium">{result.tx.hash}</span>)}
                {formatProperty('Block Number', result.tx.blockNumber?.toString() || 'Pending')}
                {formatProperty('From', <span className="bg-muted px-2 py-1 rounded text-primary font-medium">{result.tx.from}</span>)}
                {formatProperty('To', <span className="bg-muted px-2 py-1 rounded text-primary font-medium">{result.tx.to || 'Contract Creation'}</span>)}
                {formatProperty('Value', `${ethers.formatEther(result.tx.value)} ETH`)}
                {formatProperty('Gas Limit', result.tx.gasLimit.toLocaleString())}

                {result.receipt && (
                  <>
                    {formatProperty('Gas Used', `${result.receipt.gasUsed.toLocaleString()} (${((Number(result.receipt.gasUsed) / Number(result.tx.gasLimit)) * 100).toFixed(1)}%)`)}
                    {formatProperty('Gas Price', `${ethers.formatUnits(result.tx.gasPrice!, 'gwei')} Gwei`)}
                    {formatProperty('Transaction Fee', `${ethers.formatEther(result.receipt.gasUsed * result.tx.gasPrice!)} ETH`)}
                  </>
                )}

                {result.block && formatProperty('Timestamp', new Date(result.block.timestamp * 1000).toLocaleString())}
                {formatProperty('Nonce', result.tx.nonce.toString())}

                {result.tx.data && result.tx.data !== '0x' && (
                  formatProperty('Input Data',
                    result.tx.data.length > 42
                      ? `${result.tx.data.substring(0, 42)}... (${(result.tx.data.length - 2) / 2} bytes)`
                      : result.tx.data
                  )
                )}

                {/* Block Explorer Link */}
                <div className="pt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const explorerUrl = getBlockExplorerUrl(31337, result.tx.hash)
                      if (explorerUrl !== '#') {
                        window.open(explorerUrl, '_blank')
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Explorer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Event Logs */}
            {result.receipt && result.receipt.logs && result.receipt.logs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>📜 Event Logs ({result.receipt.logs.length})</CardTitle>
                  <CardDescription>
                    Decoded smart contract events from this transaction
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.receipt.logs.map((log, index) => {
                    const decodedEvent = decodeEventLog(log)

                    if (decodedEvent) {
                      const IconComponent = decodedEvent.icon
                      return (
                        <Card key={index} className="bg-muted/50 border">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-3 flex-wrap">
                              <Badge className={decodedEvent.color}>
                                <IconComponent className="h-3 w-3 mr-1" />
                                {decodedEvent.name}
                              </Badge>
                              <div className="flex items-center space-x-2 text-sm font-normal text-muted-foreground">
                                <span>{decodedEvent.contractType}</span>
                                {decodedEvent.contractInfo && (
                                  <>
                                    {decodedEvent.contractInfo.name && (
                                      <Badge variant="outline" className="text-xs">
                                        {decodedEvent.contractInfo.symbol ?
                                          `${decodedEvent.contractInfo.name} (${decodedEvent.contractInfo.symbol})` :
                                          decodedEvent.contractInfo.name
                                        }
                                      </Badge>
                                    )}
                                    {decodedEvent.contractInfo.bondTokenName && (
                                      <Badge variant="outline" className="text-xs">
                                        for {decodedEvent.contractInfo.bondTokenName}
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {decodedEvent.description}
                              {decodedEvent.contractInfo && (
                                <span className="ml-2 text-green-700 font-medium">
                                  • Known Contract
                                </span>
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-0">
                            {formatProperty('Contract Address', <span className="bg-muted px-2 py-1 rounded text-foreground">{log.address}</span>)}

                            {/* Decoded Event Arguments */}
                            {Object.entries(decodedEvent.args).map(([key, value]) => (
                              <div key={key}>
                                {formatProperty(
                                  key.charAt(0).toUpperCase() + key.slice(1),
                                  formatEventArg(key, value, decodedEvent.name)
                                )}
                              </div>
                            ))}

                            {/* Raw Data (Collapsible) */}
                            <details className="mt-4">
                              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                                View Raw Data
                              </summary>
                              <div className="mt-2 space-y-2 bg-muted p-3 rounded border text-xs text-foreground">
                                <div>
                                  <strong>Signature:</strong> {decodedEvent.signature}
                                </div>
                                <div>
                                  <strong>Topics:</strong>
                                  <div className="font-mono bg-muted p-2 rounded mt-1">
                                    {log.topics.map((topic, i) => (
                                      <div key={i}>{i}: {topic}</div>
                                    ))}
                                  </div>
                                </div>
                                {log.data && log.data !== '0x' && (
                                  <div>
                                    <strong>Data:</strong>
                                    <div className="font-mono bg-muted p-2 rounded mt-1 break-all">
                                      {log.data}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </details>

                            {/* Bid Reveal Button for BidCommitted events */}
                            <BidRevealButton log={log} decodedEvent={decodedEvent} />
                          </CardContent>
                        </Card>
                      )
                    } else {
                      // Fallback for unknown events
                      return (
                        <Card key={index} className="bg-muted/50 border-dashed">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Badge variant="secondary">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Unknown Event #{index + 1}
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              Could not decode this event - may be from an unknown contract
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-0">
                            {formatProperty('Contract Address', <span className="bg-muted px-2 py-1 rounded text-foreground">{log.address}</span>)}
                            {formatProperty('Topics',
                              <div className="bg-muted p-3 rounded text-xs leading-relaxed font-mono text-foreground">
                                {log.topics.map((topic, i) => (
                                  <div key={i}>{i}: {topic}</div>
                                ))}
                              </div>
                            )}
                            {log.data && log.data !== '0x' && formatProperty('Data',
                              <div className="bg-muted p-3 rounded text-xs font-mono break-all text-foreground">
                                {log.data}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    }
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}