#!/bin/bash

# Build script for Slidev documentation only

echo "📚 Building Slidev Documentation..."
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

# Build Documentation
echo "📚 Building documentation slides..."
cd docs

if [ ! -d "node_modules" ]; then
    echo "📦 Installing documentation dependencies..."
    npm install
fi

echo "🏗️  Running Slidev build..."
npx slidev build slides.md --base /$REPO_NAME/docs/
cd ..

if [ ! -d "docs/dist" ]; then
    echo "❌ Documentation build failed - dist directory not found"
    exit 1
fi

echo ""
echo "✅ Documentation build complete!"
echo "📁 Build output: docs/dist/"
echo ""
echo "🧪 To test the documentation build locally:"
echo "   cd docs/dist"
echo "   python3 -m http.server 8000"
echo "   # Then visit http://localhost:8000/"
echo ""
echo "📄 Landing page available at: docs/index.html"