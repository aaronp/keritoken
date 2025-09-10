#!/bin/bash

# Bond Auction Documentation Setup Script

echo "📚 Setting up Bond Auction Platform Documentation..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
    echo ""
    echo "🚀 Ready to run the presentation!"
    echo ""
    echo "Available commands:"
    echo "  npm run dev     - Start development server"
    echo "  npm run build   - Build for production" 
    echo "  npm run export  - Export as PDF"
    echo "  npm run preview - Build and preview with hot reload"
    echo ""
    echo "To start the presentation:"
    echo "  npm run dev"
    echo ""
    echo "Then open http://localhost:3030 in your browser"
    echo ""
    echo "📚 GitHub Pages Deployment:"
    echo "  The slides are automatically deployed to GitHub Pages"
    echo "  when changes are pushed to main/master branch."
    echo "  See .github/workflows/deploy-slides.yml for details."
else
    echo "❌ Failed to install dependencies"
    exit 1
fi