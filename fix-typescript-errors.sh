#!/bin/bash

# Script to fix TypeScript linting errors for GitHub Actions build

echo "🔧 Fixing TypeScript linting errors..."

# Function to check if file exists
check_file() {
    if [ ! -f "$1" ]; then
        echo "❌ File not found: $1"
        return 1
    fi
    return 0
}

# Fix AuctionBid.tsx
if check_file "ui/issuer/src/components/AuctionBid.tsx"; then
    echo "📝 Fixing AuctionBid.tsx..."
    
    # Remove unused imports
    sed -i '' "s/import { Separator } from '@\/components\/ui\/separator'//g" ui/issuer/src/components/AuctionBid.tsx
    sed -i '' "s/, TrendingUp, Clock//g" ui/issuer/src/components/AuctionBid.tsx
    
    # Remove bondTokenAddress from interface and props
    sed -i '' '/bondTokenAddress: string/d' ui/issuer/src/components/AuctionBid.tsx
    sed -i '' 's/bondTokenAddress,//' ui/issuer/src/components/AuctionBid.tsx
    
    # Fix error handling with proper typing
    sed -i '' 's/} catch (bidCheckError) {/} catch (bidCheckError: any) {/g' ui/issuer/src/components/AuctionBid.tsx
    sed -i '' 's/} catch (readError) {/} catch (readError: any) {/g' ui/issuer/src/components/AuctionBid.tsx
    
    # Fix ethers v6 interface issues
    sed -i '' 's/contractInterface\.functions/contractInterface.fragments?.filter(f => f.type === "function")/g' ui/issuer/src/components/AuctionBid.tsx
    
    # Fix Fragment type issue
    sed -i '' 's/contractInterface\.fragments\.filter(f => f\.type/contractInterface.fragments.filter((f: any) => f.type/g' ui/issuer/src/components/AuctionBid.tsx
    sed -i '' 's/functionFragments\.map(f => f\.name)/functionFragments.map((f: any) => f.name)/g' ui/issuer/src/components/AuctionBid.tsx
fi

# Fix AuctionCreationForm.tsx
if check_file "ui/issuer/src/components/AuctionCreationForm.tsx"; then
    echo "📝 Fixing AuctionCreationForm.tsx..."
    sed -i '' 's/, CalendarIcon//g' ui/issuer/src/components/AuctionCreationForm.tsx
fi

# Fix BidHistory.tsx
if check_file "ui/issuer/src/components/BidHistory.tsx"; then
    echo "📝 Fixing BidHistory.tsx..."
    sed -i '' '/import.*type BidData.*from.*storage/d' ui/issuer/src/components/BidHistory.tsx
fi

# Fix BondCreationForm.tsx
if check_file "ui/issuer/src/components/BondCreationForm.tsx"; then
    echo "📝 Fixing BondCreationForm.tsx..."
    sed -i '' 's/, CardDescription//g' ui/issuer/src/components/BondCreationForm.tsx
fi

# Fix Explorer.tsx
if check_file "ui/issuer/src/components/Explorer.tsx"; then
    echo "📝 Fixing Explorer.tsx..."
    
    # Remove loadAppState from imports
    sed -i '' 's/import { loadAppState, /import { /g' ui/issuer/src/components/Explorer.tsx
    
    # Remove LogEntry interface (multi-line removal is complex with sed, using a marker approach)
    sed -i '' '/interface LogEntry {/,/^}/d' ui/issuer/src/components/Explorer.tsx
    
    # Add underscore to unused parameter
    sed -i '' 's/contractType: string)/\_contractType: string)/g' ui/issuer/src/components/Explorer.tsx
fi

# Fix StorageDebug.tsx
if check_file "ui/issuer/src/components/StorageDebug.tsx"; then
    echo "📝 Fixing StorageDebug.tsx..."
    sed -i '' 's/const { state, clearAll }/const { clearAll }/g' ui/issuer/src/components/StorageDebug.tsx
fi

# Fix WalletConnect.tsx
if check_file "ui/issuer/src/components/WalletConnect.tsx"; then
    echo "📝 Fixing WalletConnect.tsx..."
    sed -i '' 's/, ChevronDown//g' ui/issuer/src/components/WalletConnect.tsx
fi

# Fix contracts.ts
if check_file "ui/issuer/src/lib/contracts.ts"; then
    echo "📝 Fixing contracts.ts..."
    # This needs more context to fix properly - would need to see the actual line
fi

# Fix storage.ts
if check_file "ui/issuer/src/lib/storage.ts"; then
    echo "📝 Fixing storage.ts..."
    # Fix the type checking in importAppState
    sed -i '' "s/!Array\.isArray(parsed\.bonds)/!('bonds' in parsed) || !Array.isArray(parsed.bonds)/g" ui/issuer/src/lib/storage.ts
    sed -i '' "s/!Array\.isArray(parsed\.auctions)/!('auctions' in parsed) || !Array.isArray(parsed.auctions)/g" ui/issuer/src/lib/storage.ts
fi

echo "✅ TypeScript fixes applied!"
echo ""
echo "⚠️  Note: Some fixes may require manual review, especially:"
echo "   - Complex multi-line changes"
echo "   - Context-dependent fixes"
echo ""
echo "Run 'npm run build' to verify the fixes worked."