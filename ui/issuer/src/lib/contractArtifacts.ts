// Dynamic import approach for contract artifacts
// Import from src directory to avoid Vite public folder issues

export async function loadBondTokenArtifact() {
  try {
    console.log('Loading BondToken artifact...')
    const artifact = await import('../contracts/BondToken.json')
    console.log('BondToken artifact loaded, has ABI:', !!artifact.default?.abi)
    return artifact.default
  } catch (error) {
    console.error('Failed to load BondToken artifact:', error)
    throw new Error('Failed to load BondToken artifact')
  }
}

export async function loadBondAuctionArtifact() {
  try {
    console.log('Loading BondAuction artifact...')
    const artifact = await import('../contracts/BondAuction.json')
    console.log('BondAuction artifact loaded, has ABI:', !!artifact.default?.abi)
    if (!artifact.default) {
      throw new Error('BondAuction artifact default export is undefined')
    }
    if (!artifact.default.abi) {
      throw new Error('BondAuction artifact missing ABI property')
    }
    return artifact.default
  } catch (error) {
    console.error('Failed to load BondAuction artifact:', error)
    throw new Error('Failed to load BondAuction artifact')
  }
}