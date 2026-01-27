#!/bin/bash

echo "🚀 Preparing Frontend for Render Deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🏗️ Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Build output in ./dist directory"
    echo "📊 Build size:"
    du -sh dist/
    echo ""
    echo "🎯 Ready for deployment!"
    echo "📋 Next steps:"
    echo "1. Push to GitHub"
    echo "2. Connect to Render"
    echo "3. Deploy as Static Site"
else
    echo "❌ Build failed!"
    exit 1
fi