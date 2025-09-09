/**
 * React hooks for app state management
 */

import { useState, useEffect, useCallback } from 'react'
import {
  type AppState,
  type BondTokenData,
  type AuctionData,
  type WalletState,
  type BondFormState,
  type AuctionFormState,
  loadAppState,
  saveAppState,
  addBondToken,
  addAuction,
  getMostRecentBond,
  getBondsForChain,
  getAuctionsForChain,
  updateWalletState,
  updatePreferences,
  searchBonds,
  findBondByAddress,
  saveBondFormState,
  getSavedBondFormState,
  saveAuctionFormState,
  getSavedAuctionFormState,
  getFormStateAge,
  clearFormStates
} from '@/lib/storage'

/**
 * Main app state hook
 */
export function useAppState() {
  const [state, setState] = useState<AppState>(loadAppState)

  const refreshState = useCallback(() => {
    setState(loadAppState())
  }, [])

  const updateState = useCallback((updater: (state: AppState) => AppState) => {
    const currentState = loadAppState()
    const newState = updater(currentState)
    saveAppState(newState)
    setState(newState)
  }, [])

  return {
    state,
    refreshState,
    updateState
  }
}

/**
 * Hook for managing bond tokens
 */
export function useBondTokens(chainId?: number) {
  const [bonds, setBonds] = useState<BondTokenData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshBonds = useCallback(() => {
    setIsLoading(true)
    try {
      const allBonds = chainId ? getBondsForChain(chainId) : loadAppState().bonds
      setBonds(allBonds)
    } finally {
      setIsLoading(false)
    }
  }, [chainId])

  useEffect(() => {
    refreshBonds()
  }, [refreshBonds])

  const addBond = useCallback((bondData: Omit<BondTokenData, 'deployedAt'>) => {
    const newBond = addBondToken(bondData)
    refreshBonds()
    return newBond
  }, [refreshBonds])

  const getMostRecent = useCallback(() => {
    return getMostRecentBond(chainId)
  }, [chainId])

  const searchBondTokens = useCallback((query: string) => {
    return searchBonds(query, chainId)
  }, [chainId])

  const findByAddress = useCallback((address: string) => {
    return findBondByAddress(address)
  }, [])

  return {
    bonds,
    isLoading,
    refreshBonds,
    addBond,
    getMostRecent,
    searchBonds: searchBondTokens,
    findByAddress
  }
}

/**
 * Hook for managing auctions
 */
export function useAuctions(chainId?: number) {
  const [auctions, setAuctions] = useState<AuctionData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshAuctions = useCallback(() => {
    setIsLoading(true)
    try {
      const allAuctions = chainId ? getAuctionsForChain(chainId) : loadAppState().auctions
      setAuctions(allAuctions)
    } finally {
      setIsLoading(false)
    }
  }, [chainId])

  useEffect(() => {
    refreshAuctions()
  }, [refreshAuctions])

  const addAuctionContract = useCallback((auctionData: Omit<AuctionData, 'deployedAt'>) => {
    const newAuction = addAuction(auctionData)
    refreshAuctions()
    return newAuction
  }, [refreshAuctions])

  return {
    auctions,
    isLoading,
    refreshAuctions,
    addAuction: addAuctionContract
  }
}

/**
 * Hook for wallet state management
 */
export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>(() => {
    return loadAppState().wallet
  })

  const updateWallet = useCallback((data: WalletState) => {
    updateWalletState(data)
    setWalletState(loadAppState().wallet)
  }, [])

  const refreshWallet = useCallback(() => {
    setWalletState(loadAppState().wallet)
  }, [])

  return {
    walletState,
    updateWallet,
    refreshWallet
  }
}

/**
 * Hook for user preferences
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState(() => {
    return loadAppState().preferences
  })

  const updatePrefs = useCallback((prefs: Partial<AppState['preferences']>) => {
    updatePreferences(prefs)
    setPreferences(loadAppState().preferences)
  }, [])

  const refreshPreferences = useCallback(() => {
    setPreferences(loadAppState().preferences)
  }, [])

  return {
    preferences,
    updatePreferences: updatePrefs,
    refreshPreferences
  }
}

/**
 * Hook for getting the most recent bond for form pre-population
 */
export function useMostRecentBond(chainId?: number) {
  const [recentBond, setRecentBond] = useState<BondTokenData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshRecentBond = useCallback(() => {
    setIsLoading(true)
    try {
      const bond = getMostRecentBond(chainId)
      setRecentBond(bond)
    } finally {
      setIsLoading(false)
    }
  }, [chainId])

  useEffect(() => {
    refreshRecentBond()
  }, [refreshRecentBond])

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bond-auction-app-state') {
        refreshRecentBond()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [refreshRecentBond])

  return {
    recentBond,
    isLoading,
    refreshRecentBond
  }
}

/**
 * Hook for form auto-population based on stored data
 */
export function useFormDefaults(chainId?: number) {
  const { recentBond } = useMostRecentBond(chainId)

  const getBondFormDefaults = useCallback(() => {
    return {
      name: '',
      symbol: '',
      maxSupply: '',
      faceValue: '100',
      couponRate: '2.5',
      maturityMonths: '12',
      description: ''
    }
  }, [])

  const getAuctionFormDefaults = useCallback(() => {
    return {
      bondTokenAddress: recentBond?.address || '',
      paymentTokenAddress: chainId === 31337
        ? '0x0000000000000000000000000000000000000001' // Mock USDC for local
        : chainId === 84532
          ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // USDC on Base Sepolia
          : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base Mainnet
      bondSupply: '1000',
      minPrice: '95',
      maxPrice: '105',
      commitDays: '3',
      revealDays: '2',
      claimDays: '7'
    }
  }, [recentBond, chainId])

  return {
    recentBond,
    getBondFormDefaults,
    getAuctionFormDefaults
  }
}

/**
 * Hook for bond form state management
 */
export function useBondFormState() {
  const [savedState, setSavedState] = useState<BondFormState | null>(null)
  const [stateAge, setStateAge] = useState<number | null>(null)

  const refreshSavedState = useCallback(() => {
    const saved = getSavedBondFormState()
    const age = getFormStateAge('bond')
    setSavedState(saved)
    setStateAge(age)
  }, [])

  useEffect(() => {
    refreshSavedState()
  }, [refreshSavedState])

  const saveFormState = useCallback((formData: Omit<BondFormState, 'lastUpdated'>) => {
    saveBondFormState(formData)
    refreshSavedState()
  }, [refreshSavedState])

  const getFormDefaults = useCallback(() => {
    if (savedState) {
      return {
        name: savedState.name,
        symbol: savedState.symbol,
        maxSupply: savedState.maxSupply,
        faceValue: savedState.faceValue,
        couponRate: savedState.couponRate,
        maturityMonths: savedState.maturityMonths,
        description: savedState.description
      }
    }

    // Default values when no saved state
    return {
      name: '',
      symbol: '',
      maxSupply: '',
      faceValue: '100',
      couponRate: '2.5',
      maturityMonths: '12',
      description: ''
    }
  }, [savedState])

  const clearSavedState = useCallback(() => {
    clearFormStates()
    refreshSavedState()
  }, [refreshSavedState])

  return {
    savedState,
    stateAge,
    saveFormState,
    getFormDefaults,
    clearSavedState,
    hasSavedState: savedState !== null
  }
}

/**
 * Hook for auction form state management
 */
export function useAuctionFormState(chainId?: number) {
  const [savedState, setSavedState] = useState<AuctionFormState | null>(null)
  const [stateAge, setStateAge] = useState<number | null>(null)
  const { recentBond } = useMostRecentBond(chainId)

  const refreshSavedState = useCallback(() => {
    const saved = getSavedAuctionFormState()
    const age = getFormStateAge('auction')
    setSavedState(saved)
    setStateAge(age)
  }, [])

  useEffect(() => {
    refreshSavedState()
  }, [refreshSavedState])

  const saveFormState = useCallback((formData: Omit<AuctionFormState, 'lastUpdated'>) => {
    saveAuctionFormState(formData)
    refreshSavedState()
  }, [refreshSavedState])

  const getFormDefaults = useCallback(() => {
    // Prioritize saved state over recent bond auto-population
    if (savedState && stateAge !== null && stateAge < 1440) { // Less than 24 hours old
      return {
        bondTokenAddress: savedState.bondTokenAddress,
        paymentTokenAddress: savedState.paymentTokenAddress,
        bondSupply: savedState.bondSupply,
        minPrice: savedState.minPrice,
        maxPrice: savedState.maxPrice,
        commitDays: savedState.commitDays,
        revealDays: savedState.revealDays,
        claimDays: savedState.claimDays,
        issuerPublicKey: savedState.issuerPublicKey
      }
    }

    // Fallback to smart defaults with recent bond
    return {
      bondTokenAddress: recentBond?.address || '',
      paymentTokenAddress: chainId === 31337
        ? '0x0000000000000000000000000000000000000001' // Mock USDC for local
        : chainId === 84532
          ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // USDC on Base Sepolia
          : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base Mainnet
      bondSupply: '1000',
      minPrice: '95',
      maxPrice: '105',
      commitDays: '3',
      revealDays: '2',
      claimDays: '7',
      issuerPublicKey: ''
    }
  }, [savedState, stateAge, recentBond, chainId])

  const clearSavedState = useCallback(() => {
    clearFormStates()
    refreshSavedState()
  }, [refreshSavedState])

  return {
    savedState,
    stateAge,
    saveFormState,
    getFormDefaults,
    clearSavedState,
    hasSavedState: savedState !== null && stateAge !== null && stateAge < 1440, // Less than 24 hours
    isUsingSavedState: savedState !== null && stateAge !== null && stateAge < 1440
  }
}