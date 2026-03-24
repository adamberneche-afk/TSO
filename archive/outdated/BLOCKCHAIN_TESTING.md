# Live Blockchain Testing Guide

## Quick Start

### 1. Configure Mainnet RPC

**Option A: Cloudflare (Free, No API Key)**
```bash
# packages/registry/.env
RPC_URL=https://cloudflare-eth.com
```

**Option B: Alchemy (Recommended)**
```bash
# packages/registry/.env
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

Get a free API key at: https://www.alchemy.com

### 2. Set Contract Addresses

The THINK Genesis NFT is already deployed on mainnet:
```bash
GENESIS_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
PUBLISHER_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
AUDITOR_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
```

### 3. Run Backend Tests

**Option A: Interactive (Recommended)**
```bash
cd packages/registry
npx ts-node src/scripts/test-wallet-interactive.ts
# Then enter your wallet address when prompted
```

**Option B: With Environment Variable**
```bash
cd packages/registry

# Set your wallet (use your real address, not a placeholder!)
export TEST_WALLET_ADDRESS=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
export RPC_URL=https://cloudflare-eth.com

# Run tests
npx ts-node src/scripts/test-wallet.ts
```

### 4. Test Frontend Integration

Add the test component to any page:

```tsx
// tais-frontend/app/interview/page.tsx
import { BlockchainTest } from '@/components/blockchain-test';

// Add this somewhere in the component
<BlockchainTest />
```

Then:
1. Navigate to the page
2. Connect MetaMask
3. Click "Run Blockchain Tests"
4. Verify you see:
   - ✅ Ethereum Mainnet
   - Your Genesis NFT balance
   - Publisher status

## Test Results Interpretation

### Success Cases

**You own a Genesis NFT:**
```
Network: Ethereum Mainnet ✅
Genesis NFT Balance: 1 NFT(s)
Publisher Status: ✅ Can Publish
```

**You don't own a Genesis NFT:**
```
Network: Ethereum Mainnet ✅
Genesis NFT Balance: 0 NFT(s)
Publisher Status: ❌ Cannot Publish
```

### Common Issues

**Wrong Network:**
```
Network: Sepolia Testnet ⚠️
```
Solution: Switch MetaMask to Ethereum Mainnet

**No Connection:**
```
❌ ERROR: No RPC provider configured!
```
Solution: Set RPC_URL in .env file

**Contract Not Found:**
```
❌ Error checking publisher NFT: call revert exception
```
Solution: Verify contract address is correct

## Live Testing Checklist

- [ ] RPC_URL configured with mainnet endpoint
- [ ] Contract addresses set in .env
- [ ] Backend tests pass (`test-blockchain.ts`)
- [ ] Wallet-specific tests pass (`test-wallet.ts`)
- [ ] Frontend connects to MetaMask
- [ ] Frontend detects correct network
- [ ] Frontend reads Genesis NFT balance
- [ ] Frontend displays publisher status correctly

## Security Notes

⚠️ **Never commit private keys!** These tests only use:
- Public wallet addresses (for reading)
- RPC endpoints (read-only)
- Smart contract calls (read-only)

All write operations require:
- User-initiated MetaMask transactions
- User confirmation in wallet
- User pays gas fees

## Next Steps

1. ✅ Verify mainnet connection works
2. ✅ Test Genesis NFT reading
3. 🚧 Deploy Publisher/Auditor NFTs (if needed)
4. 🚧 Test skill publishing with real NFT check
5. 🚧 Test audit submission with real NFT check

## Contract Addresses

| Contract | Address | Network |
|----------|---------|---------|
| THINK Genesis NFT | `0x11B3EfbF04F0bA505F380aC20444B6952970AdA6` | Mainnet |
| Staking Contract | `0x08071901A5C4D2950888Ce2b299bBd0e3087d101` | Mainnet |

## Support

- Contract on Etherscan: https://etherscan.io/address/0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
- OpenSea Collection: https://opensea.io/collection/think-genesis
- Discord: THINK Protocol Discord server
