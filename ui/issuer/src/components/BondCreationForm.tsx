import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarIcon, DollarSign, Percent, TrendingUp } from 'lucide-react'

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
  const [formData, setFormData] = useState<BondFormData>({
    name: '',
    symbol: '',
    maxSupply: '',
    faceValue: '100',
    couponRate: '2.5',
    maturityMonths: '12',
    description: ''
  })

  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState<string>('')

  const handleInputChange = (field: keyof BondFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDeploy = async () => {
    setIsDeploying(true)
    try {
      // Here we would integrate with the contract deployment
      // For now, we'll simulate the deployment
      await simulateDeployment()
      setDeployedAddress('0x1234567890abcdef1234567890abcdef12345678')
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