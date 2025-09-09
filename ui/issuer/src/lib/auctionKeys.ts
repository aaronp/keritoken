// Auction private key management
// Stores private keys associated with auction addresses for bid decryption

interface AuctionKeyData {
  auctionAddress: string
  privateKey: string
  publicKey: string
  deployedAt: number
  chainId: number
}

const STORAGE_KEY = 'auction-private-keys'

export function saveAuctionPrivateKey(data: AuctionKeyData): void {
  try {
    // Get existing keys
    const existing = getStoredAuctionKeys()
    
    // Add new key data
    existing[data.auctionAddress.toLowerCase()] = {
      ...data,
      auctionAddress: data.auctionAddress.toLowerCase()
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
    
    console.log(`Private key saved for auction ${data.auctionAddress}`)
  } catch (error) {
    console.error('Failed to save auction private key:', error)
  }
}

export function getAuctionPrivateKey(auctionAddress: string): AuctionKeyData | null {
  try {
    const keys = getStoredAuctionKeys()
    return keys[auctionAddress.toLowerCase()] || null
  } catch (error) {
    console.error('Failed to retrieve auction private key:', error)
    return null
  }
}

export function getStoredAuctionKeys(): Record<string, AuctionKeyData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Failed to parse stored auction keys:', error)
    return {}
  }
}

export function removeAuctionPrivateKey(auctionAddress: string): void {
  try {
    const keys = getStoredAuctionKeys()
    delete keys[auctionAddress.toLowerCase()]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch (error) {
    console.error('Failed to remove auction private key:', error)
  }
}

export function getAllAuctionKeys(): AuctionKeyData[] {
  const keys = getStoredAuctionKeys()
  return Object.values(keys).sort((a, b) => b.deployedAt - a.deployedAt)
}