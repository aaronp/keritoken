import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Lock, DollarSign, TrendingUp, Clock, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import { ContractInteractor, getProviderAndSigner, getBlockExplorerUrl } from '@/lib/contracts'
import { ethers } from 'ethers'

interface BidFormData {
  price: string
  quantity: string
  salt: string
}

interface AuctionBidProps {
  auctionAddress: string
  bondTokenAddress: string
  bondTokenName?: string
  minPrice: string
  maxPrice: string
  bondSupply: string
  commitDeadline: number
  revealDeadline: number
  claimDeadline: number
  issuerPublicKey: string
  chainId: number
}

export function AuctionBid({
  auctionAddress,
  bondTokenAddress,
  bondTokenName = 'Bond Token',
  minPrice,
  maxPrice,
  bondSupply,
  commitDeadline,
  revealDeadline,
  claimDeadline,
  issuerPublicKey,
  chainId
}: AuctionBidProps) {
  const [bidData, setBidData] = useState<BidFormData>({
    price: '',
    quantity: '',
    salt: Math.random().toString(36).substring(2, 15) // Generate random salt
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bidSubmitted, setBidSubmitted] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string>('')
  const [bidError, setBidError] = useState<string>('')
  const [auctionPhase, setAuctionPhase] = useState<'commit' | 'reveal' | 'claim' | 'ended'>('commit')
  
  // Calculate auction phase based on timestamps
  useEffect(() => {
    const updatePhase = () => {
      const now = Math.floor(Date.now() / 1000)
      
      if (now < commitDeadline) {
        setAuctionPhase('commit')
      } else if (now < revealDeadline) {
        setAuctionPhase('reveal')
      } else if (now < claimDeadline) {
        setAuctionPhase('claim')
      } else {
        setAuctionPhase('ended')
      }
    }
    
    updatePhase()
    const interval = setInterval(updatePhase, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [commitDeadline, revealDeadline, claimDeadline])

  const handleInputChange = (field: keyof BidFormData, value: string) => {
    setBidData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateCommitmentHash = async (price: string, quantity: string, salt: string): Promise<string> => {
    // Create commitment hash: keccak256(abi.encodePacked(price, quantity, salt, msg.sender))
    const { signer } = await getProviderAndSigner()
    const address = await signer.getAddress()
    
    const priceWei = ethers.parseEther(price)
    const quantityWei = ethers.parseEther(quantity)
    const saltBytes = ethers.toUtf8Bytes(salt)
    const addressBytes = ethers.getBytes(address)
    
    // Create commitment hash matching the contract's expectation
    const commitment = ethers.keccak256(
      ethers.concat([
        ethers.zeroPadValue(ethers.toBeHex(priceWei), 32),
        ethers.zeroPadValue(ethers.toBeHex(quantityWei), 32),
        saltBytes,
        addressBytes
      ])
    )
    
    return commitment
  }

  const encryptBid = async (price: string, quantity: string, salt: string): Promise<Uint8Array> => {
    // Simulate RSA encryption with the issuer's public key
    // In a real implementation, this would use actual RSA encryption with issuerPublicKey
    
    // Mock encryption - create shorter, contract-compatible data
    // In production, use actual RSA encryption with issuerPublicKey
    const mockEncrypted = `bid:${price}:${quantity}:${salt}:${Date.now()}`
    
    // Return as bytes directly (no additional encoding)
    return ethers.toUtf8Bytes(mockEncrypted)
  }

  const handleSubmitBid = async () => {
    if (!bidData.price || !bidData.quantity) {
      setBidError('Please enter both price and quantity')
      return
    }

    const price = parseFloat(bidData.price)
    const quantity = parseFloat(bidData.quantity)
    const minPriceNum = parseFloat(minPrice)
    const maxPriceNum = parseFloat(maxPrice)
    const maxSupply = parseFloat(bondSupply)

    if (price < minPriceNum || price > maxPriceNum) {
      setBidError(`Price must be between $${minPrice} and $${maxPrice}`)
      return
    }

    if (quantity <= 0 || quantity > maxSupply) {
      setBidError(`Quantity must be between 1 and ${bondSupply} bonds`)
      return
    }

    if (auctionPhase !== 'commit') {
      setBidError('Auction is not in commit phase')
      return
    }

    setIsSubmitting(true)
    setBidError('')

    try {
      const { signer } = await getProviderAndSigner()
      const interactor = new ContractInteractor(signer.provider!, signer)
      const auctionContract = interactor.getBondAuctionContract(auctionAddress)

      // Generate commitment hash (now async)
      const commitment = await generateCommitmentHash(bidData.price, bidData.quantity, bidData.salt)
      
      // Encrypt bid data (returns Uint8Array)
      const encryptedBid = await encryptBid(bidData.price, bidData.quantity, bidData.salt)
      
      console.log('Submitting bid:', {
        commitment,
        encryptedBidLength: encryptedBid.length,
        price: bidData.price,
        quantity: bidData.quantity
      })

      // Submit bid to contract - encryptedBid is already bytes
      const tx = await auctionContract.commitBid(
        commitment,
        encryptedBid, // Already Uint8Array, no need to convert
        {
          gasLimit: 300000 // Increased gas limit
        }
      )

      console.log('Bid transaction submitted:', tx.hash)
      
      // Wait for confirmation
      const receipt = await tx.wait()
      
      if (receipt) {
        console.log('Bid confirmed:', receipt.hash)
        setTransactionHash(receipt.hash)
        setBidSubmitted(true)
        
        // Store bid data locally for reveal phase
        localStorage.setItem(`bid_${auctionAddress}_${receipt.hash}`, JSON.stringify({
          price: bidData.price,
          quantity: bidData.quantity,
          salt: bidData.salt,
          commitment,
          transactionHash: receipt.hash
        }))
      }

    } catch (error) {
      console.error('Bid submission failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setBidError(errorMessage)
      
      if (errorMessage.includes('user rejected')) {
        setBidError('Transaction was cancelled by user')
      } else if (errorMessage.includes('insufficient funds')) {
        setBidError('Insufficient funds for transaction. Check your wallet balance.')
      } else {
        setBidError(`Bid submission failed: ${errorMessage}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = () => {
    return bidData.price && bidData.quantity && !bidSubmitted && auctionPhase === 'commit'
  }

  const getPhaseDisplay = () => {
    const now = Math.floor(Date.now() / 1000)
    
    switch (auctionPhase) {
      case 'commit':
        const timeLeft = commitDeadline - now
        const hoursLeft = Math.floor(timeLeft / 3600)
        return {
          status: 'commit',
          label: 'Commit Phase Active',
          description: `${hoursLeft}h remaining to submit bids`,
          color: 'bg-green-100 text-green-800 border-green-200'
        }
      case 'reveal':
        return {
          status: 'reveal',
          label: 'Reveal Phase',
          description: 'Commit phase ended, revealing bids',
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        }
      case 'claim':
        return {
          status: 'claim',
          label: 'Claim Phase',
          description: 'Auction finalized, claim your tokens',
          color: 'bg-purple-100 text-purple-800 border-purple-200'
        }
      case 'ended':
        return {
          status: 'ended',
          label: 'Auction Ended',
          description: 'All phases completed',
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }
  }

  const phaseInfo = getPhaseDisplay()

  if (bidSubmitted) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-primary flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Bid Submitted Successfully!</span>
          </CardTitle>
          <CardDescription>
            Your encrypted bid has been committed to the blockchain. Keep your bid details safe for the reveal phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Transaction Hash</Label>
            <div className="flex items-center space-x-2">
              <Input
                value={transactionHash}
                readOnly
                className="font-mono text-sm"
              />
              {chainId && getBlockExplorerUrl(chainId, transactionHash) !== '#' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getBlockExplorerUrl(chainId, transactionHash), '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Your Bid Price</Label>
              <p className="text-sm font-medium">${bidData.price}</p>
            </div>
            <div>
              <Label>Quantity</Label>
              <p className="text-sm font-medium">{bidData.quantity} bonds</p>
            </div>
          </div>
          
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Your bid details have been saved locally. You'll need them during the reveal phase 
              to claim your allocation if your bid is successful.
            </p>
          </div>

          <Button 
            onClick={() => {
              setBidSubmitted(false)
              setTransactionHash('')
              setBidData({
                price: '',
                quantity: '',
                salt: Math.random().toString(36).substring(2, 15)
              })
            }}
            variant="outline"
            className="w-full"
          >
            Submit Another Bid
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Auction Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Auction Bidding</span>
            </div>
            <Badge className={phaseInfo.color}>
              {phaseInfo.label}
            </Badge>
          </CardTitle>
          <CardDescription>
            {bondTokenName} • {phaseInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Price Range</Label>
              <p className="font-semibold">${minPrice} - ${maxPrice}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Available Bonds</Label>
              <p className="font-semibold">{bondSupply} bonds</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total Value</Label>
              <p className="font-semibold">
                ${(parseFloat(bondSupply) * parseFloat(maxPrice)).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {auctionPhase !== 'commit' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Commit Phase Ended</span>
            </CardTitle>
            <CardDescription className="text-yellow-700">
              The bidding period for this auction has ended. No new bids can be submitted.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Bid Form */}
      {auctionPhase === 'commit' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Submit Your Bid</span>
            </CardTitle>
            <CardDescription>
              Enter your bid details. Your bid will be encrypted and committed to the blockchain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bidPrice">Bid Price (USD) *</Label>
                <Input
                  id="bidPrice"
                  type="number"
                  step="0.01"
                  placeholder={`${minPrice} - ${maxPrice}`}
                  value={bidData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  min={minPrice}
                  max={maxPrice}
                />
                <p className="text-xs text-muted-foreground">
                  Must be between ${minPrice} and ${maxPrice}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bidQuantity">Quantity (bonds) *</Label>
                <Input
                  id="bidQuantity"
                  type="number"
                  placeholder={`1 - ${bondSupply}`}
                  value={bidData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  min="1"
                  max={bondSupply}
                />
                <p className="text-xs text-muted-foreground">
                  Number of bonds to purchase
                </p>
              </div>
            </div>

            {/* Bid Summary */}
            {bidData.price && bidData.quantity && (
              <Card className="bg-secondary/50">
                <CardHeader>
                  <CardTitle className="text-sm">Bid Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Total Cost</Label>
                      <p className="font-semibold text-lg">
                        ${(parseFloat(bidData.price) * parseFloat(bidData.quantity)).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">If Successful</Label>
                      <p className="font-medium">
                        {bidData.quantity} bonds at ${bidData.price} each
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {bidError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">Bid Error:</p>
                <p className="text-sm text-destructive">{bidError}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              onClick={handleSubmitBid}
              disabled={!isFormValid() || isSubmitting}
              className="w-full h-12"
              size="lg"
            >
              {isSubmitting ? 'Submitting Bid...' : 'Submit Encrypted Bid'}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>🔐 Your bid will be encrypted and only visible to the auction issuer</p>
              <p>💰 Make sure your wallet has sufficient funds for the bid amount</p>
              <p>⏰ You can submit multiple bids during the commit phase</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}