import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Search, Clock, DollarSign } from 'lucide-react'
import { useBids } from '@/hooks/useAppState'

export function BidHistory() {
  const { bids } = useBids()
  const [showAll, setShowAll] = useState(false)
  
  // Show only recent bids by default
  const displayBids = showAll ? bids : bids.slice(0, 5)

  if (bids.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Bids</span>
          </CardTitle>
          <CardDescription>
            Your bid transaction history will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm text-center py-8">
            No bids submitted yet. Submit a bid on an active auction to see it here.
          </p>
        </CardContent>
      </Card>
    )
  }

  const openExplorer = (txHash: string) => {
    const explorerUrl = `/explorer?tx=${txHash}`
    window.open(explorerUrl, '_blank')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Recent Bids ({bids.length})</span>
        </CardTitle>
        <CardDescription>
          Click on any transaction to explore it in the block explorer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayBids.map((bid) => (
          <div
            key={bid.id}
            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm">
                  ${bid.price} × {bid.quantity} bonds
                </span>
                <Badge variant="outline" className="text-xs">
                  ${(parseFloat(bid.price) * parseFloat(bid.quantity)).toLocaleString()} total
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openExplorer(bid.transactionHash)}
                className="flex items-center space-x-1 text-xs"
              >
                <Search className="h-3 w-3" />
                <span>Explore</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <span className="font-medium">Auction:</span> {bid.auctionAddress.slice(0, 8)}...{bid.auctionAddress.slice(-6)}
              </div>
              <div>
                <span className="font-medium">Block:</span> {bid.blockNumber || 'Pending'}
              </div>
            </div>
            
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-gray-600">
                {new Date(bid.submittedAt).toLocaleString()}
              </span>
              <span className="font-mono bg-muted px-2 py-1 rounded">
                {bid.transactionHash.slice(0, 10)}...{bid.transactionHash.slice(-8)}
              </span>
            </div>
          </div>
        ))}
        
        {bids.length > 5 && (
          <div className="text-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `Show All ${bids.length} Bids`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}