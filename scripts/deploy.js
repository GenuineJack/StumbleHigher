#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Stumble Higher Production Deployment Guide\n');

console.log('📋 Pre-Deployment Checklist:\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  console.log('✅ Local environment file found');
} else {
  console.log('⚠️  Local environment file not found (this is OK for deployment)');
}

console.log('\n🔧 Deployment Steps:\n');

console.log('1️⃣  SET UP PRODUCTION SUPABASE PROJECT:');
console.log('   • Go to https://supabase.com/dashboard');
console.log('   • Create a new project (or use existing)');
console.log('   • Note down your project URL and anon key');
console.log('   • Go to SQL Editor and run:');
console.log('     - scripts/database-schema.sql');
console.log('     - scripts/database-functions.sql');
console.log('   • Go to Authentication > Settings and configure providers');

console.log('\n2️⃣  DEPLOY TO VERCEL (RECOMMENDED):');
console.log('   • Install Vercel CLI: npm i -g vercel');
console.log('   • Run: vercel');
console.log('   • Follow the prompts');
console.log('   • Add environment variables in Vercel dashboard');

console.log('\n3️⃣  DEPLOY TO NETLIFY:');
console.log('   • Build the project: bun build');
console.log('   • Deploy .next folder to Netlify');
console.log('   • Configure environment variables');

console.log('\n4️⃣  REQUIRED ENVIRONMENT VARIABLES:');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_APP_URL'
];

requiredEnvVars.forEach((varName, index) => {
  console.log(`   ${index + 1}. ${varName}`);
});

console.log('\n5️⃣  OPTIONAL ENVIRONMENT VARIABLES:');
const optionalEnvVars = [
  'NEXT_PUBLIC_HIGHER_TOKEN_ADDRESS',
  'NEXT_PUBLIC_SUBMISSION_CONTRACT_ADDRESS',
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  'NEXT_PUBLIC_ALCHEMY_API_KEY',
  'POSTHOG_API_KEY',
  'SENTRY_DSN'
];

optionalEnvVars.forEach((varName, index) => {
  console.log(`   ${index + 1}. ${varName}`);
});

console.log('\n6️⃣  POST-DEPLOYMENT SETUP:');
console.log('   • Test the deployment');
console.log('   • Run: node scripts/migrate-resources.js (with production env)');
console.log('   • Create an admin user in Supabase dashboard');
console.log('   • Test admin dashboard access');
console.log('   • Configure domain and SSL');

console.log('\n🌐 DEPLOYMENT PLATFORMS:\n');

console.log('🔸 VERCEL (Recommended for Next.js):');
console.log('   • Automatic CI/CD from GitHub');
console.log('   • Built-in analytics and monitoring');
console.log('   • Edge functions support');
console.log('   • Free tier available');

console.log('\n🔸 NETLIFY:');
console.log('   • Great for static sites');
console.log('   • Built-in form handling');
console.log('   • Edge functions support');
console.log('   • Free tier available');

console.log('\n🔸 RAILWAY:');
console.log('   • Great for full-stack apps');
console.log('   • Database hosting');
console.log('   • Environment management');
console.log('   • Simple pricing');

console.log('\n🔧 QUICK DEPLOY COMMANDS:\n');

console.log('For Vercel:');
console.log('  npm i -g vercel');
console.log('  vercel --prod');

console.log('\nFor Netlify:');
console.log('  npm i -g netlify-cli');
console.log('  bun build');
console.log('  netlify deploy --prod --dir=.next');

console.log('\n⚠️  IMPORTANT NOTES:');
console.log('• Make sure NEXTAUTH_URL matches your production domain');
console.log('• Update CORS settings in Supabase if needed');
console.log('• Test all authentication providers in production');
console.log('• Monitor logs for any deployment issues');

console.log('\n✨ Ready to deploy! Choose your platform and follow the steps above.');
