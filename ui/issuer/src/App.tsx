import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { BondCreationForm } from '@/components/BondCreationForm'
import { AuctionCreationForm } from '@/components/AuctionCreationForm'
import { AuctionBidSelector } from '@/components/AuctionBidSelector'
import { WalletConnect } from '@/components/WalletConnect'
import { StorageDebug } from '@/components/StorageDebug'
import { ExternalLink, Search } from 'lucide-react'
import './App.css'

function App() {
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">Bond Auction Issuer</h1>
              <p className="text-xl text-muted-foreground">
                Create and manage bond auctions with encrypted bidding
              </p>
            </div>
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => window.open('/explorer', '_blank')}
                className="flex items-center space-x-2"
              >
                <Search className="h-4 w-4" />
                <span>Block Explorer</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Wallet Connection */}
          <WalletConnect />

          {/* Main Content */}
          <div className="w-full max-w-4xl">
            <Tabs defaultValue="create-bond" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="create-bond">Create Bond</TabsTrigger>
                <TabsTrigger value="create-auction">Create Auction</TabsTrigger>
                <TabsTrigger value="bid-auction">Bid on Auction</TabsTrigger>
                <TabsTrigger value="explorer">Explorer</TabsTrigger>
                <TabsTrigger value="storage">Storage</TabsTrigger>
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
              
              <TabsContent value="bid-auction" className="space-y-4">
                <AuctionBidSelector />
              </TabsContent>
              
              <TabsContent value="explorer" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Search className="h-5 w-5" />
                      <span>Block Explorer</span>
                    </CardTitle>
                    <CardDescription>
                      Search and explore transactions on your local blockchain
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      The block explorer is available as a dedicated page for better performance and user experience.
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => window.open('/explorer', '_blank')}
                        className="flex items-center space-x-2"
                      >
                        <Search className="h-4 w-4" />
                        <span>Open Block Explorer</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.location.href = '/explorer'}
                        className="flex items-center space-x-2"
                      >
                        <Search className="h-4 w-4" />
                        <span>Go to Explorer</span>
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p><strong>Features:</strong></p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Search transactions by hash</li>
                        <li>View transaction details and status</li>
                        <li>Explore event logs and contract interactions</li>
                        <li>Gas usage and fee information</li>
                        <li>Block and timestamp details</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="storage" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>App Storage</CardTitle>
                    <CardDescription>
                      View and manage your deployed contracts and app data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StorageDebug />
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