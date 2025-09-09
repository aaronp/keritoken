import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarIcon, DollarSign, Percent, TrendingUp, RefreshCw, ExternalLink } from 'lucide-react'
import { useBondTokens, useBondFormState } from '@/hooks/useAppState'
import { ContractDeployer, getProviderAndSigner, getBlockExplorerUrl } from '@/lib/contracts'

interface BondFormData {
  name: string
  symbol: string
  maxSupply: string
  faceValue: string
  couponRate: string
  maturityMonths: string
  description: string
}

export function BondCreationForm() {
  const { addBond } = useBondTokens()
  const { getFormDefaults, saveFormState, hasSavedState, stateAge, clearSavedState } = useBondFormState()

  const [formData, setFormData] = useState<BondFormData>(() => getFormDefaults())
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState<string>('')
  const [deployedChainId, setDeployedChainId] = useState<number>(84532)
  const [transactionHash, setTransactionHash] = useState<string>('')
  const [deploymentError, setDeploymentError] = useState<string>('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Load saved form state on mount
  useEffect(() => {
    const defaults = getFormDefaults()
    setFormData(defaults)
  }, [getFormDefaults])

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleInputChange = (field: keyof BondFormData, value: string) => {
    const newFormData = {
      ...formData,
      [field]: value
    }
    setFormData(newFormData)

    // Save form state with proper debouncing (only if form has meaningful content)
    if (newFormData.name || newFormData.symbol || newFormData.maxSupply) {
      // Cancel previous timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      
      // Set new timeout
      debounceRef.current = setTimeout(() => {
        saveFormState(newFormData)
      }, 1000) // Debounce for 1 second
    }
  }

  const handleDeploy = async () => {
    setIsDeploying(true)
    setDeploymentError('')
    
    try {
      // Get provider, signer, and current chain ID
      const { signer, chainId } = await getProviderAndSigner()
      setDeployedChainId(chainId)
      
      // Create contract deployer
      const deployer = new ContractDeployer(signer)
      
      // Calculate maturity date timestamp
      const maturityDate = new Date()
      maturityDate.setMonth(maturityDate.getMonth() + parseInt(formData.maturityMonths))
      const maturityTimestamp = Math.floor(maturityDate.getTime() / 1000)
      
      console.log('Starting bond token deployment...', {
        name: formData.name,
        symbol: formData.symbol,
        maxSupply: formData.maxSupply,
        faceValue: parseFloat(formData.faceValue),
        couponRate: parseFloat(formData.couponRate),
        maturityDate: maturityTimestamp,
        chainId
      })
      
      // Deploy the contract
      const result = await deployer.deployBondToken({
        name: formData.name,
        symbol: formData.symbol,
        maxSupply: formData.maxSupply,
        maturityDate: maturityTimestamp,
        faceValue: parseFloat(formData.faceValue),
        couponRate: parseFloat(formData.couponRate)
      })
      
      console.log('Bond token deployed successfully:', result)
      
      // Update UI state
      setDeployedAddress(result.address)
      setTransactionHash(result.transactionHash)
      
      // Save the deployed bond to state
      const bondData = {
        address: result.address,
        name: formData.name,
        symbol: formData.symbol,
        maxSupply: formData.maxSupply,
        faceValue: formData.faceValue,
        couponRate: formData.couponRate,
        maturityMonths: formData.maturityMonths,
        maturityDate: calculateMaturityDate(),
        description: formData.description || '',
        chainId: chainId,
        txHash: result.transactionHash
      }
      
      addBond(bondData)
      
    } catch (error) {
      console.error('Deployment failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setDeploymentError(errorMessage)
      
      // Show user-friendly error message
      if (errorMessage.includes('user rejected')) {
        setDeploymentError('Transaction was cancelled by user')
      } else if (errorMessage.includes('insufficient funds')) {
        setDeploymentError('Insufficient funds for deployment. Please make sure you have enough ETH for gas fees.')
      } else if (errorMessage.includes('Contract artifacts not found')) {
        setDeploymentError('Contract artifacts missing. Run "make test" in parent directory and copy artifacts to public/contracts/')
      } else if (errorMessage.includes('MetaMask')) {
        setDeploymentError('MetaMask connection error. Please check your wallet connection and try again.')
      } else if (errorMessage.includes('network')) {
        setDeploymentError('Network error. Please check your connection and try again.')
      } else {
        setDeploymentError(`Deployment failed: ${errorMessage}`)
      }
    } finally {
      setIsDeploying(false)
    }
  }


  const isFormValid = () => {
    return formData.name &&
      formData.symbol &&
      formData.maxSupply &&
      formData.faceValue &&
      formData.couponRate &&
      formData.maturityMonths
  }

  const calculateMaturityDate = () => {
    if (!formData.maturityMonths) return ''
    const months = parseInt(formData.maturityMonths)
    const maturityDate = new Date()
    maturityDate.setMonth(maturityDate.getMonth() + months)
    return maturityDate.toLocaleDateString()
  }

  if (deployedAddress) {
    return (
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="text-primary flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Bond Token Deployed Successfully!</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Contract Address</Label>
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
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Token Name</Label>
              <p className="text-sm font-medium text-foreground">{formData.name}</p>
            </div>
            <div>
              <Label>Symbol</Label>
              <p className="text-sm font-medium text-foreground">{formData.symbol}</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setDeployedAddress('')
              setTransactionHash('')
              setDeploymentError('')
              setFormData({
                name: '',
                symbol: '',
                maxSupply: '',
                faceValue: '100',
                couponRate: '2.5',
                maturityMonths: '12',
                description: ''
              })
            }}
            variant="outline"
            className="w-full"
          >
            Create Another Bond
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Form State Indicator */}
      {hasSavedState && stateAge !== null && (
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">
              Form restored from {stateAge < 60 ? `${stateAge} minutes ago` : `${Math.floor(stateAge / 60)} hours ago`}
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

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Bond Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Treasury Bond 2025"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="symbol">Token Symbol *</Label>
          <Input
            id="symbol"
            placeholder="e.g., TB25"
            value={formData.symbol}
            onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
            maxLength={10}
          />
        </div>
      </div>

      {/* Financial Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxSupply" className="flex items-center space-x-1">
            <TrendingUp className="h-4 w-4" />
            <span>Max Supply *</span>
          </Label>
          <Input
            id="maxSupply"
            type="number"
            placeholder="1000000"
            value={formData.maxSupply}
            onChange={(e) => handleInputChange('maxSupply', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Total bonds that can be issued</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="faceValue" className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4" />
            <span>Face Value *</span>
          </Label>
          <Input
            id="faceValue"
            type="number"
            step="0.01"
            placeholder="100"
            value={formData.faceValue}
            onChange={(e) => handleInputChange('faceValue', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Value at maturity (USD)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="couponRate" className="flex items-center space-x-1">
            <Percent className="h-4 w-4" />
            <span>Coupon Rate *</span>
          </Label>
          <Input
            id="couponRate"
            type="number"
            step="0.1"
            placeholder="2.5"
            value={formData.couponRate}
            onChange={(e) => handleInputChange('couponRate', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Annual interest rate (%)</p>
        </div>
      </div>

      {/* Maturity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maturityMonths" className="flex items-center space-x-1">
            <CalendarIcon className="h-4 w-4" />
            <span>Maturity Period *</span>
          </Label>
          <Input
            id="maturityMonths"
            type="number"
            placeholder="12"
            value={formData.maturityMonths}
            onChange={(e) => handleInputChange('maturityMonths', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Months until maturity</p>
        </div>

        {formData.maturityMonths && (
          <div className="space-y-2">
            <Label>Maturity Date</Label>
            <Input
              value={calculateMaturityDate()}
              readOnly
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Calculated maturity date</p>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the bond purpose, terms, and any additional information..."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
        />
      </div>

      {/* Summary Card */}
      {isFormValid() && (
        <Card className="bg-secondary border-secondary">
          <CardHeader>
            <CardTitle className="text-secondary-foreground text-lg">Bond Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Annual Yield</Label>
              <p className="font-semibold text-foreground">{formData.couponRate}%</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total Value</Label>
              <p className="font-semibold text-foreground">
                ${(parseFloat(formData.maxSupply || '0') * parseFloat(formData.faceValue || '0')).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Term</Label>
              <p className="font-semibold text-foreground">{formData.maturityMonths} months</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Maturity</Label>
              <p className="font-semibold text-foreground">{calculateMaturityDate()}</p>
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
        {isDeploying ? 'Deploying Contract...' : 'Deploy Bond Token'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        * Required fields. Make sure your wallet is connected and you have sufficient ETH for gas fees.
      </p>
    </div>
  )
}