import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BondCreationForm } from '@/components/BondCreationForm'
import { AuctionCreationForm } from '@/components/AuctionCreationForm'
import { WalletConnect } from '@/components/WalletConnect'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Bond Auction Issuer</h1>
            <p className="text-xl text-muted-foreground">
              Create and manage bond auctions with encrypted bidding
            </p>
          </div>

          {/* Wallet Connection */}
          <WalletConnect />

          {/* Main Content */}
          <div className="w-full max-w-4xl">
            <Tabs defaultValue="create-bond" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create-bond">Create Bond</TabsTrigger>
                <TabsTrigger value="create-auction">Create Auction</TabsTrigger>
              </TabsList>
              
              <TabsContent value="create-bond" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Bond Token</CardTitle>
                    <CardDescription>
                      Define the parameters for your new bond token contract
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BondCreationForm />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="create-auction" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Create Bond Auction</CardTitle>
                    <CardDescription>
                      Set up an auction for an existing bond token with encrypted bidding
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AuctionCreationForm />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App