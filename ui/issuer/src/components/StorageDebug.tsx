/**
 * Debug component to show stored app state
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppState, useBondTokens, useAuctions } from '@/hooks/useAppState'
import { getStorageStats, clearAppState } from '@/lib/storage'
import { useState, useEffect } from 'react'

export function StorageDebug() {
  const { state, refreshState } = useAppState()
  const { bonds } = useBondTokens()
  const { auctions } = useAuctions()
  const [stats, setStats] = useState<ReturnType<typeof getStorageStats> | null>(null)
  
  useEffect(() => {
    setStats(getStorageStats())
  }, [bonds, auctions])
  
  const handleClearStorage = () => {
    if (confirm('Are you sure you want to clear all stored data? This cannot be undone.')) {
      clearAppState()
      refreshState()
      setStats(getStorageStats())
    }
  }
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Storage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Total Bonds:</strong> {stats.totalBonds}
              </div>
              <div>
                <strong>Total Auctions:</strong> {stats.totalAuctions}
              </div>
              <div>
                <strong>Chains with Bonds:</strong> {stats.chainsWithBonds.join(', ') || 'None'}
              </div>
              <div>
                <strong>Chains with Auctions:</strong> {stats.chainsWithAuctions.join(', ') || 'None'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {bonds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stored Bonds ({bonds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bonds.slice(0, 5).map((bond) => (
                <div key={bond.address} className="border-l-2 border-primary pl-3">
                  <div className="font-medium">{bond.name} ({bond.symbol})</div>
                  <div className="text-xs text-muted-foreground font-mono">{bond.address}</div>
                  <div className="text-xs text-muted-foreground">
                    Deployed: {formatDate(bond.deployedAt)} • Chain: {bond.chainId}
                  </div>
                </div>
              ))}
              {bonds.length > 5 && (
                <div className="text-xs text-muted-foreground">
                  ... and {bonds.length - 5} more bonds
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {auctions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stored Auctions ({auctions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auctions.slice(0, 3).map((auction) => (
                <div key={auction.address} className="border-l-2 border-secondary pl-3">
                  <div className="font-medium">Auction for {auction.bondTokenName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{auction.address}</div>
                  <div className="text-xs text-muted-foreground">
                    Deployed: {formatDate(auction.deployedAt)} • Chain: {auction.chainId}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {auction.bondSupply} bonds • ${auction.minPrice}-${auction.maxPrice}
                  </div>
                </div>
              ))}
              {auctions.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  ... and {auctions.length - 3} more auctions
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex justify-end">
        <Button variant="destructive" size="sm" onClick={handleClearStorage}>
          Clear All Data
        </Button>
      </div>
    </div>
  )
}