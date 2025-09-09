// Direct import approach for contract artifacts
// Import from src directory to avoid Vite public folder issues

import BondTokenArtifact from '../contracts/BondToken.json'
import BondAuctionArtifact from '../contracts/BondAuction.json'

export async function loadBondTokenArtifact() {
  return BondTokenArtifact
}

export async function loadBondAuctionArtifact() {
  return BondAuctionArtifact
}