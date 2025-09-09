import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BondCreationForm } from '@/components/BondCreationForm'
import { AuctionCreationForm } from '@/components/AuctionCreationForm'
import { AuctionBid } from '@/components/AuctionBid'
import { WalletConnect } from '@/components/WalletConnect'
import { StorageDebug } from '@/components/StorageDebug'
import { useAuctions } from '@/hooks/useAppState'
import './App.css'

function App() {
  const { auctions } = useAuctions()
  const recentAuction = auctions[0] // Get the most recent auction
  
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="create-bond">Create Bond</TabsTrigger>
                <TabsTrigger value="create-auction">Create Auction</TabsTrigger>
                <TabsTrigger value="bid-auction">Bid on Auction</TabsTrigger>
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
                {recentAuction ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Bid on Auction</CardTitle>
                      <CardDescription>
                        Submit encrypted bids on the most recent auction: {recentAuction.bondTokenName}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AuctionBid
                        auctionAddress={recentAuction.address}
                        bondTokenAddress={recentAuction.bondTokenAddress}
                        bondTokenName={recentAuction.bondTokenName}
                        minPrice={recentAuction.minPrice}
                        maxPrice={recentAuction.maxPrice}
                        bondSupply={recentAuction.bondSupply}
                        commitDeadline={Math.floor(Date.now() / 1000) + (parseInt(recentAuction.commitDays) * 24 * 60 * 60)}
                        revealDeadline={Math.floor(Date.now() / 1000) + ((parseInt(recentAuction.commitDays) + parseInt(recentAuction.revealDays)) * 24 * 60 * 60)}
                        claimDeadline={Math.floor(Date.now() / 1000) + ((parseInt(recentAuction.commitDays) + parseInt(recentAuction.revealDays) + parseInt(recentAuction.claimDays)) * 24 * 60 * 60)}
                        issuerPublicKey={recentAuction.publicKey}
                        chainId={recentAuction.chainId}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>No Auctions Available</CardTitle>
                      <CardDescription>
                        Create an auction first to start bidding
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Go to the "Create Auction" tab to deploy your first bond auction, 
                        then return here to submit bids.
                      </p>
                    </CardContent>
                  </Card>
                )}
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