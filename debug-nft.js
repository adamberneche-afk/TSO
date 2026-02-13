/**
 * Debug script to check NFT verification
 * Run with: node debug-nft.js <wallet_address>
 */

const walletAddress = process.argv[2];

if (!walletAddress) {
  console.error('Usage: node debug-nft.js <wallet_address>');
  process.exit(1);
}

console.log('========================================');
console.log('NFT Verification Debug');
console.log('========================================');
console.log(`Wallet: ${walletAddress}`);
console.log(`RPC_URL: ${process.env.RPC_URL || 'https://cloudflare-eth.com'}`);
console.log(`Contract: 0x11B3EfbF04F0bA505F380aC20444B6952970AdA6`);
console.log('');

// Import the verification function
const { verifyNFTOwnership, canCreateConfiguration } = require('./packages/registry/dist/services/genesisConfigLimits');

async function test() {
  console.log('Testing NFT verification...\n');
  
  try {
    const ownership = await verifyNFTOwnership(walletAddress);
    console.log('Ownership Result:');
    console.log(JSON.stringify(ownership, null, 2));
    
    console.log('\nTesting configuration limits...\n');
    
    const configCheck = await canCreateConfiguration(walletAddress);
    console.log('Config Check Result:');
    console.log(JSON.stringify(configCheck, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
