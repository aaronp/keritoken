/**
 * App State Management Library
 * Handles persistent storage of application state including deployed contracts
 */

export interface BondTokenData {
  address: string
  name: string
  symbol: string
  maxSupply: string
  faceValue: string
  couponRate: string
  maturityMonths: string
  maturityDate: string
  description?: string
  deployedAt: number
  txHash?: string
  chainId: number
}

export interface AuctionData {
  address: string
  bondTokenAddress: string
  bondTokenName: string
  paymentTokenAddress: string
  bondSupply: string
  minPrice: string
  maxPrice: string
  commitDays: string
  revealDays: string
  claimDays: string
  publicKey: string
  deployedAt: number
  txHash?: string
  chainId: number
}

export interface WalletState {
  address?: string
  chainId?: number
  lastConnected?: number
}

export interface BondFormState {
  name: string
  symbol: string
  maxSupply: string
  faceValue: string
  couponRate: string
  maturityMonths: string
  description: string
  lastUpdated: number
}

export interface AuctionFormState {
  bondTokenAddress: string
  paymentTokenAddress: string
  bondSupply: string
  minPrice: string
  maxPrice: string
  commitDays: string
  revealDays: string
  claimDays: string
  issuerPublicKey: string
  lastUpdated: number
}

export interface FormStates {
  bondForm?: BondFormState
  auctionForm?: AuctionFormState
}

export interface AppState {
  bonds: BondTokenData[]
  auctions: AuctionData[]
  wallet: WalletState
  formStates: FormStates
  preferences: {
    theme: 'light' | 'dark' | 'system'
    defaultNetwork: number
  }
  version: string
}

const STORAGE_KEY = 'bond-auction-app-state'
const CURRENT_VERSION = '1.0.0'

// Default state
const defaultState: AppState = {
  bonds: [],
  auctions: [],
  wallet: {},
  formStates: {},
  preferences: {
    theme: 'system',
    defaultNetwork: 84532 // Base Sepolia
  },
  version: CURRENT_VERSION
}

/**
 * Safe JSON parsing with fallback
 */
function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Load app state from localStorage
 */
export function loadAppState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultState

    const parsed = safeJsonParse(stored, defaultState)
    
    // Version migration (if needed in future)
    if (parsed.version !== CURRENT_VERSION) {
      console.log('App state version mismatch, using defaults')
      return defaultState
    }

    return {
      ...defaultState,
      ...parsed,
      // Ensure arrays exist
      bonds: Array.isArray(parsed.bonds) ? parsed.bonds : [],
      auctions: Array.isArray(parsed.auctions) ? parsed.auctions : [],
      // Ensure formStates exists
      formStates: parsed.formStates && typeof parsed.formStates === 'object' ? parsed.formStates : {},
    }
  } catch (error) {
    console.error('Failed to load app state:', error)
    return defaultState
  }
}

/**
 * Save app state to localStorage
 */
export function saveAppState(state: AppState): void {
  try {
    const stateToSave = {
      ...state,
      version: CURRENT_VERSION
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
  } catch (error) {
    console.error('Failed to save app state:', error)
  }
}

/**
 * Add a deployed bond token to state
 */
export function addBondToken(bondData: Omit<BondTokenData, 'deployedAt'>): BondTokenData {
  const state = loadAppState()
  const bondWithTimestamp: BondTokenData = {
    ...bondData,
    deployedAt: Date.now()
  }
  
  // Add to beginning of array (most recent first)
  state.bonds.unshift(bondWithTimestamp)
  
  // Keep only last 50 bonds to prevent storage bloat
  if (state.bonds.length > 50) {
    state.bonds = state.bonds.slice(0, 50)
  }
  
  saveAppState(state)
  return bondWithTimestamp
}

/**
 * Add a deployed auction contract to state
 */
export function addAuction(auctionData: Omit<AuctionData, 'deployedAt'>): AuctionData {
  const state = loadAppState()
  const auctionWithTimestamp: AuctionData = {
    ...auctionData,
    deployedAt: Date.now()
  }
  
  // Add to beginning of array (most recent first)
  state.auctions.unshift(auctionWithTimestamp)
  
  // Keep only last 30 auctions to prevent storage bloat
  if (state.auctions.length > 30) {
    state.auctions = state.auctions.slice(0, 30)
  }
  
  saveAppState(state)
  return auctionWithTimestamp
}

/**
 * Get most recently deployed bond token
 */
export function getMostRecentBond(chainId?: number): BondTokenData | null {
  const state = loadAppState()
  
  if (chainId) {
    // Filter by chain ID if provided
    const bondsOnChain = state.bonds.filter(bond => bond.chainId === chainId)
    return bondsOnChain.length > 0 ? bondsOnChain[0] : null
  }
  
  return state.bonds.length > 0 ? state.bonds[0] : null
}

/**
 * Get all bond tokens for a specific chain
 */
export function getBondsForChain(chainId: number): BondTokenData[] {
  const state = loadAppState()
  return state.bonds.filter(bond => bond.chainId === chainId)
}

/**
 * Get all auctions for a specific chain
 */
export function getAuctionsForChain(chainId: number): AuctionData[] {
  const state = loadAppState()
  return state.auctions.filter(auction => auction.chainId === chainId)
}

/**
 * Update wallet state
 */
export function updateWalletState(walletData: WalletState): void {
  const state = loadAppState()
  state.wallet = {
    ...state.wallet,
    ...walletData,
    lastConnected: Date.now()
  }
  saveAppState(state)
}

/**
 * Get wallet state
 */
export function getWalletState(): WalletState {
  const state = loadAppState()
  return state.wallet
}

/**
 * Update user preferences
 */
export function updatePreferences(preferences: Partial<AppState['preferences']>): void {
  const state = loadAppState()
  state.preferences = {
    ...state.preferences,
    ...preferences
  }
  saveAppState(state)
}

/**
 * Get user preferences
 */
export function getPreferences(): AppState['preferences'] {
  const state = loadAppState()
  return state.preferences
}

/**
 * Clear all app state (useful for testing or reset)
 */
export function clearAppState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear app state:', error)
  }
}

/**
 * Export all data for backup
 */
export function exportAppState(): string {
  const state = loadAppState()
  return JSON.stringify(state, null, 2)
}

/**
 * Import data from backup
 */
export function importAppState(jsonData: string): boolean {
  try {
    const parsed = safeJsonParse(jsonData, null)
    if (!parsed) return false
    
    // Validate structure
    if (typeof parsed !== 'object' || !Array.isArray(parsed.bonds) || !Array.isArray(parsed.auctions)) {
      return false
    }
    
    saveAppState(parsed as AppState)
    return true
  } catch (error) {
    console.error('Failed to import app state:', error)
    return false
  }
}

/**
 * Get statistics about stored data
 */
export function getStorageStats() {
  const state = loadAppState()
  return {
    totalBonds: state.bonds.length,
    totalAuctions: state.auctions.length,
    chainsWithBonds: [...new Set(state.bonds.map(b => b.chainId))],
    chainsWithAuctions: [...new Set(state.auctions.map(a => a.chainId))],
    oldestBond: state.bonds.length > 0 ? new Date(Math.min(...state.bonds.map(b => b.deployedAt))) : null,
    newestBond: state.bonds.length > 0 ? new Date(Math.max(...state.bonds.map(b => b.deployedAt))) : null,
  }
}

/**
 * Search bonds by name or symbol
 */
export function searchBonds(query: string, chainId?: number): BondTokenData[] {
  const state = loadAppState()
  let bonds = chainId ? getBondsForChain(chainId) : state.bonds
  
  if (!query.trim()) return bonds
  
  const searchTerm = query.toLowerCase()
  return bonds.filter(bond => 
    bond.name.toLowerCase().includes(searchTerm) ||
    bond.symbol.toLowerCase().includes(searchTerm) ||
    bond.address.toLowerCase().includes(searchTerm)
  )
}

/**
 * Find bond by contract address
 */
export function findBondByAddress(address: string): BondTokenData | null {
  const state = loadAppState()
  return state.bonds.find(bond => 
    bond.address.toLowerCase() === address.toLowerCase()
  ) || null
}

/**
 * Save bond form state
 */
export function saveBondFormState(formData: Omit<BondFormState, 'lastUpdated'>): void {
  const state = loadAppState()
  state.formStates.bondForm = {
    ...formData,
    lastUpdated: Date.now()
  }
  saveAppState(state)
}

/**
 * Get saved bond form state
 */
export function getSavedBondFormState(): BondFormState | null {
  const state = loadAppState()
  return state.formStates.bondForm || null
}

/**
 * Save auction form state
 */
export function saveAuctionFormState(formData: Omit<AuctionFormState, 'lastUpdated'>): void {
  const state = loadAppState()
  state.formStates.auctionForm = {
    ...formData,
    lastUpdated: Date.now()
  }
  saveAppState(state)
}

/**
 * Get saved auction form state
 */
export function getSavedAuctionFormState(): AuctionFormState | null {
  const state = loadAppState()
  return state.formStates.auctionForm || null
}

/**
 * Clear form states
 */
export function clearFormStates(): void {
  const state = loadAppState()
  state.formStates = {}
  saveAppState(state)
}

/**
 * Get form state age in minutes
 */
export function getFormStateAge(formType: 'bond' | 'auction'): number | null {
  const state = loadAppState()
  const formState = formType === 'bond' ? state.formStates.bondForm : state.formStates.auctionForm
  
  if (!formState) return null
  
  return Math.floor((Date.now() - formState.lastUpdated) / (1000 * 60))
}