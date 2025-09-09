import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { CalendarIcon, Clock, DollarSign, Lock, Key } from 'lucide-react'
import { useFormDefaults, useAuctions, useBondTokens } from '@/hooks/useAppState'

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
  const { recentBond, getAuctionFormDefaults } = useFormDefaults(84532) // Default to Base Sepolia
  const { addAuction } = useAuctions()
  const { bonds } = useBondTokens(84532)
  
  const [formData, setFormData] = useState<AuctionFormData>({
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

  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState<string>('')
  const [deployedChainId, setDeployedChainId] = useState<number>(84532)
  const [generatedKeys, setGeneratedKeys] = useState<{
    publicKey: string
    privateKey: string
  } | null>(null)
  
  // Auto-populate form with defaults when component mounts or recent bond changes
  useEffect(() => {
    const defaults = getAuctionFormDefaults()
    setFormData(prev => ({
      ...prev,
      ...defaults
    }))
  }, [getAuctionFormDefaults])

  const handleInputChange = (field: keyof AuctionFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateKeyPair = async () => {
    // Simulate RSA key generation
    // In a real implementation, this would use the crypto utilities from the parent project
    const mockPublicKey = "0x30820122300d06092a864886f70d01010105000382010f003082010a0282010100..."
    const mockPrivateKey = "308204bc020100300d06092a864886f70d0101010500048204a6308204a202010002820101..."
    
    setGeneratedKeys({
      publicKey: mockPublicKey,
      privateKey: mockPrivateKey
    })
    
    setFormData(prev => ({
      ...prev,
      issuerPublicKey: mockPublicKey
    }))
  }

  const handleDeploy = async () => {
    setIsDeploying(true)
    try {
      // Here we would integrate with the auction contract deployment
      await simulateDeployment()
      const mockAuctionAddress = '0xabcdef1234567890abcdef1234567890abcdef12'
      setDeployedAddress(mockAuctionAddress)
      
      // Find the bond name for better UX
      const bondName = recentBond?.name || 'Unknown Bond'
      
      // Save the deployed auction to state
      const auctionData = {
        address: mockAuctionAddress,
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
        chainId: deployedChainId,
        txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'
      }
      
      addAuction(auctionData)
      
    } catch (error) {
      console.error('Deployment failed:', error)
      alert('Deployment failed. Please check your wallet connection and try again.')
    } finally {
      setIsDeploying(false)
    }
  }

  const simulateDeployment = () => {
    return new Promise(resolve => setTimeout(resolve, 3000))
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
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>Auction Contract Deployed Successfully!</span>
          </CardTitle>
          <CardDescription className="text-green-700">
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
                    className="font-mono text-xs h-20"
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
                    className="font-mono text-xs h-16"
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
      {/* Contract Addresses */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bondToken">Bond Token Contract Address *</Label>
          <div className="space-y-2">
            <Input
              id="bondToken"
              placeholder="0x..."
              value={formData.bondTokenAddress}
              onChange={(e) => handleInputChange('bondTokenAddress', e.target.value)}
              className="font-mono"
            />
            {bonds.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Or select from your deployed bonds:</Label>
                <Select value={formData.bondTokenAddress} onValueChange={(value) => handleInputChange('bondTokenAddress', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a deployed bond" />
                  </SelectTrigger>
                  <SelectContent>
                    {bonds.map((bond) => (
                      <SelectItem key={bond.address} value={bond.address}>
                        {bond.name} ({bond.symbol}) - {bond.address.slice(0, 8)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {recentBond && formData.bondTokenAddress === recentBond.address ? (
            <p className="text-xs text-primary">
              ✓ Auto-filled with your most recent bond: {recentBond.name} ({recentBond.symbol})
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Address of the deployed bond token contract
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
                  className="font-mono text-xs h-16"
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