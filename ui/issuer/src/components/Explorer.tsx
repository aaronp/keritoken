import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Search, AlertCircle } from 'lucide-react'
import { ethers } from 'ethers'
import { getBlockExplorerUrl } from '@/lib/contracts'

interface TransactionResult {
  tx: ethers.TransactionResponse
  receipt: ethers.TransactionReceipt | null
  block: ethers.Block | null
}

interface LogEntry {
  address: string
  topics: string[]
  data: string
}

export function Explorer() {
  const [txHash, setTxHash] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TransactionResult | null>(null)
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null)

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
      <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
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
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-lg">
            <h1 className="text-3xl font-light mb-2">🔍 Local Block Explorer</h1>
            <p className="opacity-90">Explore transactions on your Hardhat local network</p>
          </div>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter transaction hash (0x...)"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                onKeyPress={handleKeyPress}
                className="font-mono"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isLoading}
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
              <p className="text-muted-foreground text-lg">🔄 Searching for transaction...</p>
            </CardContent>
          </Card>
        )}

        {/* Transaction Results */}
        {result && (
          <div className="space-y-6">
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
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.receipt.logs.map((log, index) => (
                    <Card key={index} className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-sm">Event {index + 1}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-0">
                        {formatProperty('Address', <span className="bg-background px-2 py-1 rounded">{log.address}</span>)}
                        {formatProperty('Topics', 
                          <div className="bg-background p-3 rounded text-xs leading-relaxed">
                            {log.topics.join('\n')}
                          </div>
                        )}
                        {log.data && log.data !== '0x' && formatProperty('Data', <span className="bg-background px-2 py-1 rounded">{log.data}</span>)}
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}