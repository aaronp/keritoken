#!/bin/bash

# Build script for GitHub Pages deployment (local testing)

echo "🏗️  Building Bond Auction Platform for GitHub Pages..."
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

# Set repository name (change this to match your GitHub repository)
REPO_NAME="auctions"
echo "📝 Using repository name: $REPO_NAME"
echo "   (Update this in build-for-pages.sh if different)"
echo ""

# Create deployment directory
echo "📁 Creating deployment directory..."
rm -rf deploy
mkdir -p deploy

# Build UI
echo "🎨 Building UI application..."
cd ui/issuer
if [ ! -d "node_modules" ]; then
    echo "📦 Installing UI dependencies..."
    npm install
fi
npm run build -- --base=/$REPO_NAME/
cd ../..

# Copy UI to deployment root
echo "📋 Copying UI to deployment directory..."
cp -r ui/issuer/dist/* deploy/

# Build Documentation
echo "📚 Building documentation slides..."
cd docs
if [ ! -d "node_modules" ]; then
    echo "📦 Installing documentation dependencies..."
    npm install
fi
npx slidev build slides.md --base /$REPO_NAME/docs/
cd ..

# Copy docs to deployment/docs
echo "📋 Copying documentation to deployment directory..."
mkdir -p deploy/docs
cp -r docs/dist/* deploy/docs/

# Create landing page
echo "🏠 Creating landing page..."
cat > deploy/landing.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bond Auction Platform</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            text-align: center;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 3rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .links {
            display: flex;
            gap: 2rem;
            justify-content: center;
            margin-top: 2rem;
        }
        .link-card {
            flex: 1;
            padding: 2rem;
            background: #f8f9fa;
            border-radius: 8px;
            text-decoration: none;
            color: #333;
            transition: all 0.3s ease;
        }
        .link-card:hover {
            background: #e9ecef;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .icon { font-size: 3rem; margin-bottom: 1rem; }
        @media (max-width: 600px) {
            .links { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏛️ Bond Auction Platform</h1>
        <p>Decentralized bond auctions with encrypted bidding</p>
        
        <div class="links">
            <a href="./index.html" class="link-card">
                <div class="icon">💼</div>
                <h2>Launch Application</h2>
                <p>Create bonds, run auctions, and submit bids</p>
            </a>
            
            <a href="./docs/" class="link-card">
                <div class="icon">📚</div>
                <h2>View Documentation</h2>
                <p>Interactive slides and user guide</p>
            </a>
        </div>
    </div>
</body>
</html>
EOF

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