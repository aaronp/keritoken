import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, DollarSign, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import { ContractInteractor, getProviderAndSigner, getBlockExplorerUrl } from '@/lib/contracts'
import { useBids } from '@/hooks/useAppState'
import { ethers } from 'ethers'

interface BidFormData {
  price: string
  quantity: string
  salt: number
}

interface AuctionBidProps {
  auctionAddress: string
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
    salt: Math.floor(Math.random() * 1000000000) // Generate random numeric salt
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bidSubmitted, setBidSubmitted] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string>('')
  const [bidError, setBidError] = useState<string>('')
  const [auctionPhase, setAuctionPhase] = useState<'commit' | 'reveal' | 'claim' | 'ended'>('commit')
  
  // Hook for bid management
  const { addBid } = useBids()
  
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

  const generateCommitmentHash = async (price: string, quantity: string, salt: number): Promise<string> => {
    // Create commitment hash: keccak256(abi.encodePacked(msg.sender, price, quantity, salt))
    // Must match contract: bytes32 commitment = keccak256(abi.encodePacked(msg.sender, price, quantity, salt));
    const { signer } = await getProviderAndSigner()
    const address = await signer.getAddress()
    
    // Convert to proper units matching contract expectations
    const priceUnits = ethers.parseUnits(price.toString(), 6); // Price in USDC units (6 decimals)
    const quantityWei = ethers.parseEther(quantity.toString()); // Quantity in bond units (18 decimals)
    const saltBigInt = BigInt(salt)
    
    // Use solidityPacked to match contract's abi.encodePacked
    // Order MUST match contract: [address, price, quantity, salt]
    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [address, priceUnits, quantityWei, saltBigInt]
      )
    )
    
    return commitment
  }

  const encryptBid = async (price: string, quantity: string, salt: number): Promise<Uint8Array> => {
    try {
      // Convert hex public key back to ArrayBuffer
      const publicKeyHex = issuerPublicKey.startsWith('0x') ? issuerPublicKey.slice(2) : issuerPublicKey
      const publicKeyBytes = new Uint8Array(
        publicKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      )
      
      // Import the public key for encryption
      const publicKey = await window.crypto.subtle.importKey(
        "spki",
        publicKeyBytes,
        {
          name: "RSA-OAEP",
          hash: "SHA-256"
        },
        false,
        ["encrypt"]
      )
      
      // Create bid data object
      const bidData = JSON.stringify({
        price,
        quantity,
        salt,
        timestamp: Date.now(),
        bidder: await (await getProviderAndSigner()).signer.getAddress()
      })
      
      // Encrypt the bid data
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP"
        },
        publicKey,
        new TextEncoder().encode(bidData)
      )
      
      return new Uint8Array(encryptedBuffer)
    } catch (error) {
      console.error('Failed to encrypt bid:', error)
      throw new Error('Failed to encrypt bid data')
    }
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
      console.log('Signer address:', await signer.getAddress())
      console.log('Target auction address:', auctionAddress)
      
      // Verify contract exists at address
      const contractCode = await signer.provider!.getCode(auctionAddress)
      console.log('Contract code length:', contractCode.length)
      if (contractCode === '0x') {
        throw new Error('No contract deployed at the specified address')
      }

      const interactor = new ContractInteractor(signer.provider!, signer)
      const auctionContract = await interactor.getBondAuctionContract(auctionAddress)
      
      console.log('Contract instance created, testing interface...')
      console.log('auctionContract:', auctionContract)
      console.log('auctionContract type:', typeof auctionContract)
      
      if (!auctionContract) {
        throw new Error('Failed to create auction contract instance')
      }
      
      // Store interface reference to avoid potential issues
      const contractInterface = auctionContract.interface
      console.log('contractInterface:', contractInterface)
      console.log('contractInterface type:', typeof contractInterface)
      
      if (!contractInterface) {
        throw new Error('Contract interface is undefined - artifact loading failed')
      }
      
      console.log('Interface properties:', Object.keys(contractInterface))
      console.log('Interface fragments:', contractInterface.fragments)
      console.log('Interface forEachFunction:', contractInterface.forEachFunction)
      
      // Try getting functions through fragments
      if (contractInterface.fragments) {
        const functionFragments = contractInterface.fragments.filter((f: any) => f.type === 'function')
        console.log('Function fragments:', functionFragments.map((f: any) => f.name || 'unnamed'))
      }
      
      // Try alternative methods to get functions
      if (contractInterface.forEachFunction) {
        const functionNames: string[] = []
        contractInterface.forEachFunction((_func: any, index: number) => {
          functionNames.push(`function_${index}`)
        })
        console.log('Functions via forEachFunction:', functionNames)
      }
      
      console.log('Proceeding to test if contract methods work directly')

      // Test basic contract read call first to verify ABI and check auction state
      console.log('Testing contract connection and checking auction state...')
      try {
        const contractBondSupply = await auctionContract.bondSupply()
        const contractMinPrice = await auctionContract.minPrice()
        const contractMaxPrice = await auctionContract.maxPrice()
        const contractCommitDeadline = await auctionContract.commitDeadline()
        const contractRevealDeadline = await auctionContract.revealDeadline()
        const contractState = await auctionContract.state()
        
        const currentTime = Math.floor(Date.now() / 1000)
        const commitDeadlineNum = Number(contractCommitDeadline)
        const revealDeadlineNum = Number(contractRevealDeadline)
        
        console.log('Contract state check:', {
          bondSupply: contractBondSupply.toString(),
          minPrice: contractMinPrice.toString(),
          maxPrice: contractMaxPrice.toString(),
          commitDeadline: commitDeadlineNum,
          revealDeadline: revealDeadlineNum,
          auctionState: contractState,
          currentTime: currentTime,
          isCommitPhase: currentTime < commitDeadlineNum,
          timeUntilCommitEnd: commitDeadlineNum - currentTime,
          commitDeadlineDate: new Date(commitDeadlineNum * 1000).toLocaleString(),
          currentDate: new Date().toLocaleString()
        })
        
        // Detailed validation based on contract requirements  
        // Convert BigInt to Number for comparison
        const stateNumber = Number(contractState)
        if (stateNumber !== 1) { // 1 is Commit state (Setup=0, Commit=1, Reveal=2, Finalized=3, Distributed=4)
          const stateNames = ['Setup', 'Commit', 'Reveal', 'Finalized', 'Distributed']
          const stateName = stateNames[stateNumber] || 'Unknown'
          throw new Error(`Auction is not in commit phase. Current state: ${stateName} (${stateNumber})`)
        }
        
        if (currentTime >= commitDeadlineNum) {
          throw new Error(`Commit phase has ended. Deadline was ${new Date(commitDeadlineNum * 1000).toLocaleString()}`)
        }
        
        // Check if user already has a bid committed
        const userAddress = await signer.getAddress()
        try {
          const existingBid = await auctionContract.bids(userAddress)
          console.log('Existing bid check:', existingBid)
          
          // In Solidity, bytes32(0) is the default value, so we check if commitment is not zero
          if (existingBid.commitment !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            throw new Error('You have already committed a bid for this auction. Each address can only bid once.')
          }
        } catch (bidCheckError) {
          const errorMessage = bidCheckError instanceof Error ? bidCheckError.message : 'Unknown error'
          console.log('Could not check existing bid (might be expected):', errorMessage)
        }
        
      } catch (readError) {
        console.error('Contract read test failed:', readError)
        const errorMessage = readError instanceof Error ? readError.message : 'Unknown error'
        if (readError instanceof Error && 'code' in readError && 'data' in readError) {
          console.error('Read error details:', {
            message: errorMessage,
            code: (readError as any).code,
            data: (readError as any).data
          })
        }
        throw new Error(`Pre-flight validation failed: ${errorMessage}`)
      }

      // Generate commitment hash (now async)
      const commitment = await generateCommitmentHash(bidData.price, bidData.quantity, bidData.salt)
      
      // Encrypt bid data (returns Uint8Array)
      const encryptedBid = await encryptBid(bidData.price, bidData.quantity, bidData.salt)
      
      console.log('Submitting bid:', {
        commitment,
        commitmentType: typeof commitment,
        encryptedBid: encryptedBid,
        encryptedBidLength: encryptedBid.length,
        encryptedBidType: typeof encryptedBid,
        price: bidData.price,
        quantity: bidData.quantity
      })

      // Verify types are correct for contract call
      if (typeof commitment !== 'string' || !commitment.startsWith('0x') || commitment.length !== 66) {
        throw new Error(`Invalid commitment format: ${commitment}`)
      }
      if (!(encryptedBid instanceof Uint8Array)) {
        throw new Error(`Invalid encrypted bid format: ${typeof encryptedBid}`)
      }
      if (encryptedBid.length === 0) {
        throw new Error('Encrypted bid is empty - encryption failed')
      }

      // Check if commitBid function exists in contract interface
      try {
        if (auctionContract.interface && auctionContract.interface.getFunction) {
          const commitBidFunction = auctionContract.interface.getFunction('commitBid')
          if (commitBidFunction) {
            console.log('commitBid function signature:', commitBidFunction.format())
            console.log('commitBid function selector:', commitBidFunction.selector)
          }
        } else {
          console.log('getFunction method not available, will try direct contract call')
        }
      } catch (funcError) {
        console.error('commitBid function not found in contract interface:', funcError)
        console.log('Will try direct contract call anyway')
      }

      // Verify contract deployment
      console.log('Verifying deployed contract...')
      const deployedCode = await signer.provider!.getCode(auctionAddress)
      if (deployedCode === '0x') {
        throw new Error('No contract found at address - deployment may have failed')
      }
      console.log('Contract deployed code length:', deployedCode.length)
      console.log('Expected contract with commitBid function')

      // Try gas estimation first
      console.log('Estimating gas for commitBid...')
      try {
        const estimatedGas = await auctionContract.commitBid.estimateGas(
          commitment,
          encryptedBid
        )
        console.log('Estimated gas:', estimatedGas.toString())
      } catch (gasError) {
        console.error('Gas estimation failed:', gasError)
        console.log('This might indicate the transaction would revert')
      }

      // Submit bid to contract - encryptedBid is already bytes
      console.log('Calling commitBid with:', {
        commitment,
        encryptedBidLength: encryptedBid.length,
        gasLimit: 400000
      })
      
      const tx = await auctionContract.commitBid(
        commitment,
        encryptedBid, // Already Uint8Array, no need to convert
        {
          gasLimit: 400000 // Increased gas limit
        }
      )

      console.log('Bid transaction submitted:', tx.hash)
      
      // Wait for confirmation
      const receipt = await tx.wait()
      
      if (receipt) {
        console.log('Bid confirmed:', receipt.hash)
        setTransactionHash(receipt.hash)
        setBidSubmitted(true)
        
        // Save bid data to local storage using new bid management system
        const bidderAddress = await signer.getAddress()
        addBid({
          auctionAddress,
          bidderAddress,
          transactionHash: receipt.hash,
          price: bidData.price,
          quantity: bidData.quantity,
          salt: bidData.salt,
          commitment,
          encryptedBid: ethers.hexlify(encryptedBid),
          chainId,
          blockNumber: receipt.blockNumber
        })
        
        // Keep the old localStorage for backwards compatibility
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
                salt: Math.floor(Math.random() * 1000000000)
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