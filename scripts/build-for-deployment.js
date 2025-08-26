#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Building Stumble Higher for deployment...\n');

try {
  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('bun install', { stdio: 'inherit' });

  // Build the Next.js application
  console.log('🔨 Building Next.js application...');
  execSync('bun run build', { stdio: 'inherit' });

  // Check if build was successful
  const buildPath = path.join(__dirname, '..', '.next');
  if (fs.existsSync(buildPath)) {
    console.log('✅ Build completed successfully!');

    // Show build info
    const stats = fs.statSync(buildPath);
    console.log(`📁 Build directory: .next`);
    console.log(`📅 Built at: ${stats.mtime}`);

    console.log('\n🚀 Ready for deployment!');
    console.log('Deploy with one of these methods:');
    console.log('• Vercel: vercel --prod');
    console.log('• Netlify: netlify deploy --prod --dir=.next');
    console.log('• Or push to your Git repository for automatic deployment');

  } else {
    throw new Error('Build failed - .next directory not found');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
