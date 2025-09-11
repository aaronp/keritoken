#!/bin/bash

# Build script for UI application only

echo "🎨 Building Bond Auction UI Application..."
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

echo "✅ Prerequisites found"
echo ""

# Get repository name from parameter or use default
REPO_NAME="${1:-auctions}"
echo "📝 Using repository name: $REPO_NAME"
echo ""

# Build UI
echo "🎨 Building UI application..."
cd ui/issuer
if [ ! -d "node_modules" ]; then
    echo "📦 Installing UI dependencies..."
    npm install
fi

echo "🏗️  Running TypeScript compilation and Vite build..."
npm run build -- --base=/$REPO_NAME/
cd ../..

if [ ! -d "ui/issuer/dist" ]; then
    echo "❌ UI build failed - dist directory not found"
    exit 1
fi

echo ""
echo "✅ UI build complete!"
echo "📁 Build output: ui/issuer/dist/"
echo ""
echo "🧪 To test the UI build locally:"
echo "   cd ui/issuer/dist"
echo "   python3 -m http.server 8000"
echo "   # Then visit http://localhost:8000/"