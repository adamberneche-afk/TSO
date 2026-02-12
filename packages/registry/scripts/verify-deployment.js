#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Run this before production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 TAIS Platform - Deployment Verification\n');

let errors = 0;
let warnings = 0;

// Check 1: TokenBlacklist model exists
console.log('✓ Check 1: TokenBlacklist Model');
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');
if (schema.includes('model TokenBlacklist')) {
  console.log('  ✅ TokenBlacklist model found in schema');
} else {
  console.log('  ❌ TokenBlacklist model MISSING');
  errors++;
}

// Check 2: Migration file exists
console.log('\n✓ Check 2: Database Migration');
const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20250213000000_add_token_blacklist');
if (fs.existsSync(migrationPath)) {
  console.log('  ✅ Migration file exists');
} else {
  console.log('  ❌ Migration file missing');
  errors++;
}

// Check 3: Build output exists
console.log('\n✓ Check 3: TypeScript Build');
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  console.log(`  ✅ Build output exists (${files.length} files)`);
} else {
  console.log('  ❌ dist/ folder missing - Run: npm run build');
  errors++;
}

// Check 4: Environment variables
console.log('\n✓ Check 4: Environment Variables');
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'PUBLISHER_NFT_ADDRESS',
  'ADMIN_WALLET_ADDRESSES'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length === 0) {
  console.log('  ✅ All required environment variables set');
} else {
  console.log(`  ⚠️  Missing environment variables: ${missingVars.join(', ')}`);
  warnings++;
}

// Check 5: Admin wallets configured
console.log('\n✓ Check 5: Admin Wallet Configuration');
const adminWallets = process.env.ADMIN_WALLET_ADDRESSES?.split(',').map(w => w.trim()).filter(w => w) || [];
if (adminWallets.length > 0) {
  console.log(`  ✅ ${adminWallets.length} admin wallet(s) configured`);
  adminWallets.forEach(w => {
    if (w.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.log(`     ✓ ${w.substring(0, 6)}...${w.substring(38)}`);
    } else {
      console.log(`     ⚠️  Invalid format: ${w}`);
      warnings++;
    }
  });
} else {
  console.log('  ⚠️  No admin wallets configured (admin routes will fail)');
  warnings++;
}

// Check 6: JWT Secret strength
console.log('\n✓ Check 6: JWT Secret');
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.log('  ❌ JWT_SECRET not set');
  errors++;
} else if (jwtSecret.length < 32) {
  console.log(`  ❌ JWT_SECRET too short (${jwtSecret.length} chars, need 32+)`);
  errors++;
} else if (jwtSecret === 'your_super_secret_jwt_key_change_in_production' || jwtSecret === 'dev-secret') {
  console.log('  ❌ JWT_SECRET is using default value');
  errors++;
} else {
  console.log(`  ✅ JWT_SECRET configured (${jwtSecret.length} chars)`);
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors === 0 && warnings === 0) {
  console.log('✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT');
  process.exit(0);
} else if (errors === 0) {
  console.log(`⚠️  ${warnings} warning(s) - Can deploy but review warnings`);
  process.exit(0);
} else {
  console.log(`❌ ${errors} error(s), ${warnings} warning(s) - FIX BEFORE DEPLOYING`);
  process.exit(1);
}
