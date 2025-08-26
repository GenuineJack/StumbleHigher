#!/bin/bash

echo "🚀 Stumble Higher Quick Deploy to Vercel"
echo "========================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "✅ Vercel CLI is available"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build the project
echo "🔨 Building project..."
bun run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check your code and try again."
    exit 1
fi

echo "✅ Build successful"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo ""
echo "🔑 You'll need to set these environment variables in Vercel:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - NEXTAUTH_SECRET"
echo ""
echo "📋 Starting deployment..."

vercel --prod

echo ""
echo "✨ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Set up your Supabase database"
echo "3. Run content migration: node scripts/migrate-resources.js"
echo "4. Create an admin user"
echo "5. Test your application"
echo ""
echo "🎉 Your Stumble Higher platform is live!"
