import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuctionBid } from './AuctionBid'
import { useAuctions } from '@/hooks/useAppState'
import { Clock, DollarSign, TrendingUp } from 'lucide-react'

export function AuctionBidSelector() {
  const { auctions } = useAuctions()
  const [selectedAuctionAddress, setSelectedAuctionAddress] = useState<string>('')

  const selectedAuction = auctions.find(auction => auction.address === selectedAuctionAddress)

  if (auctions.length === 0) {
    return (
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
    )
  }

  return (
    <div className="space-y-6">
      {/* Auction Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Select Auction</span>
          </CardTitle>
          <CardDescription>
            Choose an auction contract to place bids on
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auction-select">Available Auctions</Label>
            <Select value={selectedAuctionAddress} onValueChange={setSelectedAuctionAddress}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an auction to bid on" />
              </SelectTrigger>
              <SelectContent>
                {auctions
                  .sort((a, b) => (b.deployedAt || 0) - (a.deployedAt || 0)) // Sort by deployment date, newest first
                  .map((auction) => {
                    const deployedDate = auction.deployedAt ? new Date(auction.deployedAt) : null
                    const timeDisplay = deployedDate ? 
                      `${deployedDate.toLocaleDateString()} ${deployedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                      : 'Unknown time'
                    
                    // Calculate if auction is still in commit phase (approximate)
                    // Note: This is a rough estimate since we don't store the actual contract deadlines
                    const now = Math.floor(Date.now() / 1000)
                    const deployedAt = Math.floor((auction.deployedAt || Date.now()) / 1000)
                    const commitDeadline = deployedAt + (parseInt(auction.commitDays) * 24 * 60 * 60)
                    const isActive = now < commitDeadline
                    
                    return (
                      <SelectItem key={auction.address} value={auction.address}>
                        <div className="flex flex-col w-full">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{auction.bondTokenName}</span>
                            {isActive && <span className="text-xs text-green-600 font-medium">ACTIVE</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {auction.address.slice(0, 8)}...{auction.address.slice(-6)} • 
                            ${auction.minPrice}-${auction.maxPrice} • 
                            {auction.bondSupply} bonds • 
                            Deployed {timeDisplay}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
              </SelectContent>
            </Select>
          </div>

          {selectedAuction && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary/20 rounded-lg border">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs text-muted-foreground">Price Range</Label>
                  <p className="text-sm font-medium">${selectedAuction.minPrice} - ${selectedAuction.maxPrice}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs text-muted-foreground">Bond Supply</Label>
                  <p className="text-sm font-medium">{selectedAuction.bondSupply} bonds</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <p className="text-sm font-medium">
                    {parseInt(selectedAuction.commitDays) + parseInt(selectedAuction.revealDays)} days
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bidding Interface */}
      {selectedAuction && (() => {
        // Calculate actual deadlines based on deployment time
        const deployedAt = Math.floor((selectedAuction.deployedAt || Date.now()) / 1000)
        const commitDeadline = deployedAt + (parseInt(selectedAuction.commitDays) * 24 * 60 * 60)
        const revealDeadline = commitDeadline + (parseInt(selectedAuction.revealDays) * 24 * 60 * 60)
        const claimDeadline = revealDeadline + (parseInt(selectedAuction.claimDays) * 24 * 60 * 60)
        
        return (
          <AuctionBid
            auctionAddress={selectedAuction.address}
            bondTokenAddress={selectedAuction.bondTokenAddress}
            bondTokenName={selectedAuction.bondTokenName}
            minPrice={selectedAuction.minPrice}
            maxPrice={selectedAuction.maxPrice}
            bondSupply={selectedAuction.bondSupply}
            commitDeadline={commitDeadline}
            revealDeadline={revealDeadline}
            claimDeadline={claimDeadline}
            issuerPublicKey={selectedAuction.publicKey}
            chainId={selectedAuction.chainId}
          />
        )
      })()}
    </div>
  )
}