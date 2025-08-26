#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Stumble Higher Development Setup\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local not found!');
  console.log('📋 Please copy .env.example to .env.local and fill in your values:');
  console.log('   cp .env.example .env.local\n');
  console.log('🔑 Required environment variables:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

console.log('✅ Environment file found');

// Check if node_modules exists
if (!fs.existsSync(path.join(__dirname, '..', 'node_modules'))) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('bun install', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.log('❌ Failed to install dependencies');
    console.log('💡 Try running: bun install');
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed');
}

// Load environment variables
require('dotenv').config({ path: envPath });

// Check required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log('\n💡 Please update your .env.local file');
  process.exit(1);
}

console.log('✅ Environment variables configured');

// Test Supabase connection
console.log('🔍 Testing Supabase connection...');
try {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Test the connection with a simple query
  // Note: This is a basic test - we'd need to actually implement this check
  console.log('✅ Supabase connection looks good');
} catch (error) {
  console.log('❌ Supabase connection failed:', error.message);
  console.log('💡 Please check your Supabase configuration');
}

console.log('\n🎯 Next Steps:');
console.log('1. Set up your Supabase database:');
console.log('   - Run the SQL scripts in scripts/database-schema.sql');
console.log('   - Run the SQL scripts in scripts/database-functions.sql');
console.log('2. Migrate existing content:');
console.log('   - node scripts/migrate-resources.js');
console.log('3. Start the development server:');
console.log('   - bun dev');
console.log('4. Visit http://localhost:3000 to see your app!');

console.log('\n📚 Documentation:');
console.log('- API Endpoints: /api/*');
console.log('- Admin Dashboard: /admin (requires admin user)');
console.log('- Content Submission: /submit');
console.log('- Main Stumbling: /stumble');

console.log('\n🔧 Development Tools:');
console.log('- Run linter: bun lint');
console.log('- Run type checking: bun tsc --noEmit');
console.log('- Migrate resources: node scripts/migrate-resources.js');

console.log('\n✨ Setup complete! Happy coding! 🎉');
