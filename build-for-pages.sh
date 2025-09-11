#!/bin/bash

# Build script for GitHub Pages deployment (local testing)
# Uses separate build scripts for UI and documentation

echo "🏗️  Building Bond Auction Platform for GitHub Pages..."
echo ""

# Set repository name (change this to match your GitHub repository)
REPO_NAME="auctions"
echo "📝 Using repository name: $REPO_NAME"
echo "   (Update this in build-for-pages.sh if different)"
echo ""

# Make sure build scripts are executable
chmod +x build-ui.sh build-docs.sh

# Create deployment directory
echo "📁 Creating deployment directory..."
rm -rf deploy
mkdir -p deploy

# Build UI using separate script
echo "🎨 Building UI..."
./build-ui.sh "$REPO_NAME"
if [ $? -ne 0 ]; then
    echo "❌ UI build failed"
    exit 1
fi

# Copy UI to deployment root
echo "📋 Copying UI to deployment directory..."
cp -r ui/issuer/dist/* deploy/

# Build Documentation using separate script
echo "📚 Building documentation..."
./build-docs.sh "$REPO_NAME"
if [ $? -ne 0 ]; then
    echo "❌ Documentation build failed"
    exit 1
fi

# Copy docs to deployment/docs
echo "📋 Copying documentation to deployment directory..."
mkdir -p deploy/docs
cp -r docs/dist/* deploy/docs/

# Copy landing page from docs
echo "🏠 Copying landing page..."
cp docs/landing.html deploy/landing.html

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Deployment directory contents:"
ls -la deploy/
echo ""
echo "🌐 To test locally:"
echo "   cd deploy"
echo "   python3 -m http.server 8000"
echo "   # or: npx serve -s ."
echo ""
echo "Then visit:"
echo "   - http://localhost:8000/landing.html (landing page)"
echo "   - http://localhost:8000/ (main app)"
echo "   - http://localhost:8000/docs/ (documentation)"
echo ""
echo "🚀 When pushed to GitHub, this will be available at:"
echo "   https://[username].github.io/$REPO_NAME/"