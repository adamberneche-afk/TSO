/**
 * Live Blockchain Testing Script
 * Tests NFT verification on Ethereum Mainnet
 * 
 * Usage: npx ts-node src/scripts/test-blockchain.ts
 */

import { nftVerification } from '../services/nftVerification';

// Test wallet addresses (public addresses only - no private keys needed for read operations)
function getTestWallet(): string | null {
  const addr = process.env.TEST_WALLET_ADDRESS;
  if (!addr) return null;
  // Check for placeholder
  if (addr.includes('YOUR') || addr.includes('...')) return null;
  // Validate format
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  return addr;
}

const userWallet = getTestWallet();

const TEST_ADDRESSES: Record<string, string> = {
  // Vitalik's address (high likelihood of holding various NFTs)
  vitalik: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  // THINK deployer address
  thinkDeployer: '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6',
  // Random address (likely no NFTs)
  random: '0x1234567890123456789012345678901234567890',
};

// Add user wallet if valid
if (userWallet) {
  TEST_ADDRESSES.yourWallet = userWallet;
}

async function testBlockchainConnection() {
  console.log('🧪 Starting Live Blockchain Tests\n');
  console.log('='.repeat(60));
  
  // 1. Check service status
  console.log('\n📊 NFT Verification Service Status:');
  const status = nftVerification.getStatus();
  console.log('  Publisher Configured:', status.publisherConfigured ? '✅' : '❌');
  console.log('  Auditor Configured:', status.auditorConfigured ? '✅' : '❌');
  console.log('  Provider Connected:', status.providerConnected ? '✅' : '❌');
  
  if (!status.providerConnected) {
    console.error('\n❌ ERROR: No RPC provider configured!');
    console.log('   Set RPC_URL in your .env file to run live tests.');
    console.log('   Example: RPC_URL=https://cloudflare-eth.com');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🔗 Testing Mainnet Connection...');

  try {
    // Test with THINK Genesis NFT
    console.log('\n🎨 Testing THINK Genesis NFT Verification:');
    console.log('  Contract: 0x11B3EfbF04F0bA505F380aC20444B6952970AdA6');
    
    for (const [name, address] of Object.entries(TEST_ADDRESSES)) {
      console.log(`\n  Testing ${name}: ${address}`);
      try {
        const isPublisher = await nftVerification.isPublisher(address);
        const isAuditor = await nftVerification.isAuditor(address);
        const balance = await nftVerification.getPublisherBalance(address);
        
        console.log(`    Publisher NFT: ${isPublisher ? '✅ YES' : '❌ NO'}`);
        console.log(`    Auditor NFT: ${isAuditor ? '✅ YES' : '❌ NO'}`);
        console.log(`    Balance: ${balance} NFT(s)`);
      } catch (error) {
        console.error(`    ❌ Error: ${error}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Blockchain Tests Complete!\n');

  } catch (error) {
    console.error('\n❌ Blockchain test failed:', error);
    process.exit(1);
  }
}

// Run tests
testBlockchainConnection().catch(console.error);
