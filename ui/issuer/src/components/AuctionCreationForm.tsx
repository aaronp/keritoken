import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { CalendarIcon, Clock, DollarSign, Lock, Key, RefreshCw, ExternalLink } from 'lucide-react'
import { useFormDefaults, useAuctions, useBondTokens, useAuctionFormState } from '@/hooks/useAppState'
import { ContractDeployer, getProviderAndSigner, getBlockExplorerUrl } from '@/lib/contracts'
import { saveAuctionPrivateKey } from '@/lib/auctionKeys'

interface AuctionFormData {
  bondTokenAddress: string
  paymentTokenAddress: string
  bondSupply: string
  minPrice: string
  maxPrice: string
  commitDays: string
  revealDays: string
  claimDays: string
  issuerPublicKey: string
}

export function AuctionCreationForm() {
  const [currentChainId, setCurrentChainId] = useState<number>(31337) // Default to Hardhat local
  const { recentBond } = useFormDefaults(currentChainId)
  const { addAuction } = useAuctions()
  const { bonds, isLoading: bondsLoading } = useBondTokens(currentChainId)
  const { bonds: allBonds } = useBondTokens() // Get bonds from all chains as fallback
  const { 
    getFormDefaults, 
    saveFormState, 
    hasSavedState, 
    stateAge, 
    clearSavedState,
    isUsingSavedState 
  } = useAuctionFormState(currentChainId)
  
  const [formData, setFormData] = useState<AuctionFormData>(() => getFormDefaults())
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState<string>('')
  const [deployedChainId, setDeployedChainId] = useState<number>(currentChainId)
  const [transactionHash, setTransactionHash] = useState<string>('')
  const [deploymentError, setDeploymentError] = useState<string>('')
  const [generatedKeys, setGeneratedKeys] = useState<{
    publicKey: string
    privateKey: string
  } | null>(null)

  // Update chainId when wallet connects or changes
  useEffect(() => {
    const updateChainId = async () => {
      try {
        const { chainId } = await getProviderAndSigner()
        setCurrentChainId(chainId)
        setDeployedChainId(chainId)
      } catch (error) {
        console.log('Wallet not connected, using default chainId')
      }
    }
    
    updateChainId()
  }, [])
  
  // Load form defaults on mount and when they change
  useEffect(() => {
    const defaults = getFormDefaults()
    setFormData(defaults)
  }, [getFormDefaults])

  // Debug logging for bonds
  useEffect(() => {
    console.log('AuctionCreationForm bonds debug:', {
      currentChainId,
      bondsOnCurrentChain: bonds.length,
      bonds: bonds.map(b => ({ name: b.name, address: b.address, chainId: b.chainId })),
      allBonds: allBonds.length,
      allBondsData: allBonds.map(b => ({ name: b.name, address: b.address, chainId: b.chainId })),
      bondsLoading
    })
  }, [bonds, allBonds, currentChainId, bondsLoading])

  const handleInputChange = (field: keyof AuctionFormData, value: string) => {
    const newFormData = {
      ...formData,
      [field]: value
    }
    setFormData(newFormData)
    
    // Save form state with debouncing (only if form has meaningful content)
    if (newFormData.bondTokenAddress || newFormData.bondSupply || newFormData.minPrice) {
      setTimeout(() => {
        saveFormState(newFormData)
      }, 1000) // Debounce for 1 second
    }
  }

  const generateKeyPair = async () => {
    try {
      // Generate real RSA key pair using Web Crypto API
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]), // 65537
          hash: "SHA-256"
        },
        true, // extractable
        ["encrypt", "decrypt"]
      )
      
      // Export public key in SPKI format
      const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey)
      const publicKeyArray = new Uint8Array(publicKeyBuffer)
      const publicKeyHex = "0x" + Array.from(publicKeyArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      // Export private key in PKCS8 format
      const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
      const privateKeyArray = new Uint8Array(privateKeyBuffer)
      const privateKeyHex = "0x" + Array.from(privateKeyArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      setGeneratedKeys({
        publicKey: publicKeyHex,
        privateKey: privateKeyHex
      })
      
      setFormData(prev => ({
        ...prev,
        issuerPublicKey: publicKeyHex
      }))
    } catch (error) {
      console.error('Failed to generate RSA key pair:', error)
      alert('Failed to generate encryption keys. Please try again.')
    }
  }

  const handleDeploy = async () => {
    setIsDeploying(true)
    setDeploymentError('')
    
    try {
      // Get provider, signer, and current chain ID
      const { signer, chainId: currentChainId } = await getProviderAndSigner()
      setDeployedChainId(currentChainId)
      
      // Create contract deployer
      const deployer = new ContractDeployer(signer)
      
      console.log('Starting auction contract deployment...', {
        bondTokenAddress: formData.bondTokenAddress,
        paymentTokenAddress: formData.paymentTokenAddress,
        bondSupply: formData.bondSupply,
        minPrice: formData.minPrice,
        maxPrice: formData.maxPrice,
        commitDays: parseInt(formData.commitDays),
        revealDays: parseInt(formData.revealDays),
        claimDays: parseInt(formData.claimDays),
        issuerPublicKey: formData.issuerPublicKey,
        chainId: currentChainId
      })
      
      // Deploy the contract
      const result = await deployer.deployBondAuction({
        bondTokenAddress: formData.bondTokenAddress,
        paymentTokenAddress: formData.paymentTokenAddress,
        bondSupply: formData.bondSupply,
        minPrice: formData.minPrice,
        maxPrice: formData.maxPrice,
        commitDuration: parseInt(formData.commitDays),
        revealDuration: parseInt(formData.revealDays),
        claimDuration: parseInt(formData.claimDays),
        issuerPublicKey: formData.issuerPublicKey
      })
      
      console.log('Auction contract deployed successfully:', result)
      
      // Update UI state
      setDeployedAddress(result.address)
      setTransactionHash(result.transactionHash)
      
      // Find the bond name for better UX
      const bondName = recentBond?.name || 'Unknown Bond'
      
      // Save the deployed auction to state
      const auctionData = {
        address: result.address,
        bondTokenAddress: formData.bondTokenAddress,
        bondTokenName: bondName,
        paymentTokenAddress: formData.paymentTokenAddress,
        bondSupply: formData.bondSupply,
        minPrice: formData.minPrice,
        maxPrice: formData.maxPrice,
        commitDays: formData.commitDays,
        revealDays: formData.revealDays,
        claimDays: formData.claimDays,
        publicKey: formData.issuerPublicKey,
        chainId: currentChainId,
        txHash: result.transactionHash
      }
      
      addAuction(auctionData)
      
      // Save the private key associated with this auction
      if (generatedKeys) {
        saveAuctionPrivateKey({
          auctionAddress: result.address,
          privateKey: generatedKeys.privateKey,
          publicKey: generatedKeys.publicKey,
          deployedAt: Date.now(),
          chainId: currentChainId
        })
      }
      
    } catch (error) {
      console.error('Auction deployment failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setDeploymentError(errorMessage)
      
      // Show user-friendly error message
      if (errorMessage.includes('user rejected')) {
        // User cancelled transaction
      } else if (errorMessage.includes('insufficient funds')) {
        alert('Insufficient funds for deployment. Please make sure you have enough ETH for gas fees.')
      } else if (errorMessage.includes('MetaMask')) {
        alert('MetaMask connection error. Please check your wallet connection and try again.')
      } else {
        alert(`Deployment failed: ${errorMessage}`)
      }
    } finally {
      setIsDeploying(false)
    }
  }


  const isFormValid = () => {
    return formData.bondTokenAddress && 
           formData.paymentTokenAddress && 
           formData.bondSupply && 
           formData.minPrice && 
           formData.maxPrice && 
           formData.issuerPublicKey &&
           parseFloat(formData.minPrice) < parseFloat(formData.maxPrice)
  }

  const calculateDeadlines = () => {
    const now = new Date()
    const commitDeadline = new Date(now.getTime() + parseInt(formData.commitDays) * 24 * 60 * 60 * 1000)
    const revealDeadline = new Date(commitDeadline.getTime() + parseInt(formData.revealDays) * 24 * 60 * 60 * 1000)
    const claimDeadline = new Date(revealDeadline.getTime() + parseInt(formData.claimDays) * 24 * 60 * 60 * 1000)
    
    return {
      commit: commitDeadline.toLocaleDateString() + ' ' + commitDeadline.toLocaleTimeString(),
      reveal: revealDeadline.toLocaleDateString() + ' ' + revealDeadline.toLocaleTimeString(),
      claim: claimDeadline.toLocaleDateString() + ' ' + claimDeadline.toLocaleTimeString()
    }
  }

  if (deployedAddress) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-primary flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>Auction Contract Deployed Successfully!</span>
          </CardTitle>
          <CardDescription className="text-primary/80">
            Your encrypted bidding auction is now live
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Auction Contract Address</Label>
            <Input 
              value={deployedAddress} 
              readOnly 
              className="font-mono text-sm"
            />
          </div>
          
          {transactionHash && (
            <div>
              <Label>Transaction Hash</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={transactionHash}
                  readOnly
                  className="font-mono text-sm"
                />
                {deployedChainId && getBlockExplorerUrl(deployedChainId, transactionHash) !== '#' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getBlockExplorerUrl(deployedChainId, transactionHash), '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {generatedKeys && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800 text-sm flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>🔐 CRITICAL: Save Your Private Key</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-yellow-800">Private Key (Keep Secure!)</Label>
                  <Textarea 
                    value={generatedKeys.privateKey}
                    readOnly 
                    className="font-mono text-xs h-20 text-gray-900 bg-white"
                  />
                  <p className="text-xs text-yellow-700 mt-1">
                    ⚠️ You need this to decrypt bids during the auction. Store it securely!
                  </p>
                </div>
                <div>
                  <Label className="text-yellow-800">Public Key (Already in Contract)</Label>
                  <Textarea 
                    value={generatedKeys.publicKey}
                    readOnly 
                    className="font-mono text-xs h-16 text-gray-900 bg-white"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bond Supply</Label>
              <p className="text-sm font-medium">{formData.bondSupply} bonds</p>
            </div>
            <div>
              <Label>Price Range</Label>
              <p className="text-sm font-medium">${formData.minPrice} - ${formData.maxPrice}</p>
            </div>
          </div>

          <Button 
            onClick={() => {
              setDeployedAddress('')
              setTransactionHash('')
              setDeploymentError('')
              setGeneratedKeys(null)
              setFormData({
                bondTokenAddress: '',
                paymentTokenAddress: '',
                bondSupply: '',
                minPrice: '',
                maxPrice: '',
                commitDays: '3',
                revealDays: '2',
                claimDays: '7',
                issuerPublicKey: ''
              })
            }}
            variant="outline"
            className="w-full"
          >
            Create Another Auction
          </Button>
        </CardContent>
      </Card>
    )
  }

  const deadlines = calculateDeadlines()

  return (
    <div className="space-y-6">
      {/* Form State Indicator */}
      {(hasSavedState || isUsingSavedState) && stateAge !== null && (
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">
              {isUsingSavedState 
                ? `Using saved form data from ${stateAge < 60 ? `${stateAge} minutes ago` : `${Math.floor(stateAge / 60)} hours ago`}`
                : `Form restored from ${stateAge < 60 ? `${stateAge} minutes ago` : `${Math.floor(stateAge / 60)} hours ago`}`
              }
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              clearSavedState()
              setFormData(getFormDefaults())
            }}
          >
            Clear
          </Button>
        </div>
      )}
      
      {/* Contract Addresses */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bondToken">Bond Token Contract Address *</Label>
          <div className="space-y-2">
            {(() => {
              // Use bonds from current chain, fallback to all bonds if none on current chain
              const availableBonds = bonds.length > 0 ? bonds : allBonds;
              const showingAllChains = bonds.length === 0 && allBonds.length > 0;
              
              return availableBonds.length > 0 ? (
                <>
                  {showingAllChains && (
                    <div className="p-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded">
                      ⚠️ No bonds found on current network (Chain {currentChainId}). Showing bonds from all networks.
                    </div>
                  )}
                  <Select value={formData.bondTokenAddress} onValueChange={(value) => handleInputChange('bondTokenAddress', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a deployed bond" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBonds
                        .sort((a, b) => (b.deployedAt || 0) - (a.deployedAt || 0)) // Sort by deployment date, newest first
                        .map((bond) => {
                          const deployedDate = bond.deployedAt ? new Date(bond.deployedAt) : null;
                          const timeDisplay = deployedDate ? 
                            `${deployedDate.toLocaleDateString()} ${deployedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                            : 'Unknown time';
                          
                          const networkName = bond.chainId === 31337 ? 'Local' : 
                                            bond.chainId === 84532 ? 'Base Sepolia' :
                                            bond.chainId === 8453 ? 'Base' : 
                                            `Chain ${bond.chainId}`;
                          
                          return (
                            <SelectItem key={bond.address} value={bond.address}>
                              <div className="flex flex-col">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{bond.name} ({bond.symbol})</span>
                                  <span className="text-xs px-1 py-0.5 bg-blue-100 text-blue-800 rounded">
                                    {networkName}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {bond.address.slice(0, 8)}...{bond.address.slice(-6)} • Deployed {timeDisplay}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Or enter address manually:</Label>
                    <Input
                      id="bondToken"
                      placeholder="0x..."
                      value={formData.bondTokenAddress}
                      onChange={(e) => handleInputChange('bondTokenAddress', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 text-sm text-muted-foreground bg-muted/50 border border-dashed rounded-lg text-center">
                    {bondsLoading ? (
                      'Loading bonds...'
                    ) : (
                      <>
                        No bond tokens found. Create a bond token first in the "Create Bond" tab,<br />
                        then return here to create an auction.
                      </>
                    )}
                  </div>
                  <Input
                    id="bondToken"
                    placeholder="0x..."
                    value={formData.bondTokenAddress}
                    onChange={(e) => handleInputChange('bondTokenAddress', e.target.value)}
                    className="font-mono"
                  />
                </div>
              );
            })()}
          </div>
          {recentBond && formData.bondTokenAddress === recentBond.address ? (
            <p className="text-xs text-primary">
              ✓ Using your most recent bond: {recentBond.name} ({recentBond.symbol})
            </p>
          ) : formData.bondTokenAddress ? (
            <p className="text-xs text-muted-foreground">
              Using bond contract: {formData.bondTokenAddress.slice(0, 8)}...{formData.bondTokenAddress.slice(-6)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a deployed bond or enter contract address
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentToken">Payment Token Address *</Label>
          <div className="flex space-x-2">
            <Input
              id="paymentToken"
              placeholder="0x... (USDC address)"
              value={formData.paymentTokenAddress}
              onChange={(e) => handleInputChange('paymentTokenAddress', e.target.value)}
              className="font-mono flex-1"
            />
            <Select onValueChange={(value) => handleInputChange('paymentTokenAddress', value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Quick select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913">
                  USDC (Base Mainnet)
                </SelectItem>
                <SelectItem value="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512">
                  Mock USDC (Local)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Auction Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bondSupply">Bond Supply *</Label>
          <Input
            id="bondSupply"
            type="number"
            placeholder="10000"
            value={formData.bondSupply}
            onChange={(e) => handleInputChange('bondSupply', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Bonds to auction</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minPrice" className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4" />
            <span>Min Price *</span>
          </Label>
          <Input
            id="minPrice"
            type="number"
            step="0.01"
            placeholder="85.00"
            value={formData.minPrice}
            onChange={(e) => handleInputChange('minPrice', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Minimum bid price</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxPrice" className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4" />
            <span>Max Price *</span>
          </Label>
          <Input
            id="maxPrice"
            type="number"
            step="0.01"
            placeholder="100.00"
            value={formData.maxPrice}
            onChange={(e) => handleInputChange('maxPrice', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Maximum bid price</p>
        </div>
      </div>

      {/* Auction Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Auction Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="commitDays">Commit Phase</Label>
            <Select value={formData.commitDays} onValueChange={(value) => handleInputChange('commitDays', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="2">2 days</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Ends: {deadlines.commit}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="revealDays">Reveal Phase</Label>
            <Select value={formData.revealDays} onValueChange={(value) => handleInputChange('revealDays', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="2">2 days</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Ends: {deadlines.reveal}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="claimDays">Claim Period</Label>
            <Select value={formData.claimDays} onValueChange={(value) => handleInputChange('claimDays', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Ends: {deadlines.claim}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Encryption Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Bid Encryption</span>
          </CardTitle>
          <CardDescription>
            Generate RSA key pair for encrypted bidding. Only you can decrypt the bids during the auction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!generatedKeys ? (
            <Button onClick={generateKeyPair} variant="outline" className="w-full">
              Generate Encryption Keys
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-green-600">
                <Key className="h-4 w-4" />
                <span className="text-sm font-medium">Keys Generated Successfully</span>
              </div>
              <div className="space-y-2">
                <Label>Public Key (for contract)</Label>
                <Textarea 
                  value={generatedKeys.publicKey}
                  readOnly
                  className="font-mono text-xs h-16 text-gray-900 bg-white"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The private key will be shown after deployment. Keep it secure!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {isFormValid() && (
        <Card className="bg-secondary border-secondary">
          <CardHeader>
            <CardTitle className="text-secondary-foreground text-lg">Auction Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Total Bonds</Label>
              <p className="font-semibold text-foreground">{formData.bondSupply} bonds</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Price Range</Label>
              <p className="font-semibold text-foreground">${formData.minPrice} - ${formData.maxPrice}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Max Value</Label>
              <p className="font-semibold text-foreground">
                ${(parseFloat(formData.bondSupply || '0') * parseFloat(formData.maxPrice || '0')).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Duration</Label>
              <p className="font-semibold text-foreground">
                {parseInt(formData.commitDays) + parseInt(formData.revealDays)} days total
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {deploymentError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive font-medium">Deployment Error:</p>
          <p className="text-sm text-destructive">{deploymentError}</p>
        </div>
      )}

      {/* Deploy Button */}
      <Button 
        onClick={handleDeploy}
        disabled={!isFormValid() || isDeploying}
        className="w-full h-12"
        size="lg"
      >
        {isDeploying ? 'Deploying Auction...' : 'Deploy Auction Contract'}
      </Button>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>* Required fields. Ensure your wallet is connected with sufficient ETH for gas.</p>
        <p>🔐 Encrypted bidding allows only the issuer to see bid details during the auction.</p>
      </div>
    </div>
  )
}