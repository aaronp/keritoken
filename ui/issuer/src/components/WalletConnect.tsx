import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Wallet, ChevronDown } from 'lucide-react'

interface WalletInfo {
  address: string
  isConnected: boolean
  chainId?: number
  balance?: string
}

export function WalletConnect() {
  const [wallet, setWallet] = useState<WalletInfo>({ address: '', isConnected: false })
  const [isConnecting, setIsConnecting] = useState(false)

  // Check if wallet is already connected on page load
  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' })
          setWallet({
            address: accounts[0],
            isConnected: true,
            chainId: parseInt(chainId, 16)
          })
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is not installed. Please install MetaMask to continue.')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        setWallet({
          address: accounts[0],
          isConnected: true,
          chainId: parseInt(chainId, 16)
        })
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWallet({ address: '', isConnected: false })
  }

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 1: return 'Ethereum Mainnet'
      case 8453: return 'Base Mainnet'
      case 84532: return 'Base Sepolia'
      case 31337: return 'Hardhat Local'
      default: return `Chain ${chainId}`
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!wallet.isConnected) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <Wallet className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Connect Wallet</h3>
              <p className="text-sm text-muted-foreground">
                Connect your wallet to create bonds and auctions
              </p>
            </div>
            <Button 
              onClick={connectWallet} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <div>
              <p className="font-semibold">{formatAddress(wallet.address)}</p>
              <p className="text-sm text-muted-foreground">
                {wallet.chainId && getNetworkName(wallet.chainId)}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={disconnectWallet}
          >
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Extend the window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}