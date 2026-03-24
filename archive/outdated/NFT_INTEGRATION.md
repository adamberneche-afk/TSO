# Environment Configuration for NFT Integration

## 📋 Required Environment Variables

### Frontend (Vite)
```bash
# Registry API
VITE_REGISTRY_URL=https://tso.onrender.com

# Blockchain
VITE_RPC_URL=https://cloudflare-eth.com
VITE_GENESIS_CONTRACT=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
```

### Backend Services
```bash
# NFT Contract Addresses
# Currently using THINK Genesis Bundle for beta
# Future: Custom contracts deployed via $THINK staking
PUBLISHER_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
AUDITOR_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6

# Ethereum RPC Endpoint
RPC_URL=https://cloudflare-eth.com

# Alternative: Alchemy (recommended for production)
# RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

## 🔄 Architecture Overview

### Current Implementation (Beta)
The system uses **environment variables** with fallback defaults:

```typescript
// Core services read from env vars with Genesis Bundle as default
const DEFAULT_PUBLISHER_NFT = process.env.PUBLISHER_NFT_ADDRESS || 
                               process.env.GENESIS_CONTRACT || 
                               '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';
```

This allows **runtime configuration** without code changes:
- ✅ Supports THINK Genesis Bundle (current)
- ✅ Supports custom contracts (future)
- ✅ Supports different addresses for publisher vs auditor
- ✅ Constructor parameters for programmatic configuration

### Future Scaling (Post-Beta)
As the network grows, users will pay a small fee in $THINK to mint:
- **Publisher NFTs** - Required to publish skills to the registry
- **Auditor NFTs** - Required to submit security audits

To migrate:
1. Deploy new Publisher NFT contract
2. Deploy new Auditor NFT contract
3. Update environment variables:
   ```bash
   PUBLISHER_NFT_ADDRESS=0xNewPublisherContract
   AUDITOR_NFT_ADDRESS=0xNewAuditorContract
   ```
4. **No code changes required!**

## 🔍 Integration Checklist

### ✅ COMPLETED INTEGRATIONS

#### 1. Contract Address Configuration
- [x] Updated `IsnadService.ts` with environment variable support
- [x] Updated `AuditRegistry.ts` with environment variable support  
- [x] Genesis Bundle address as default for beta testing
- [x] Constructor parameters for programmatic configuration
- [x] Added logging to show which contract is being used

#### 2. Verification Methods
- [x] `verifyPublisherNft()` - Checks Publisher NFT balance
- [x] `verifyAuditorNft()` - Checks Auditor NFT balance
- [x] Both methods use configurable contract addresses
- [x] Error handling for failed RPC calls

#### 3. Testing Integration
- [x] Demo updated with correct addresses displayed
- [x] Build system compiles successfully
- [x] All packages link correctly
- [x] Environment variable validation

## 🚀 Next Steps for Deployment

### 1. Contract Verification (Optional for Beta)
```bash
# Verify contract exists on mainnet
curl -X GET "https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6&address=YOUR_WALLET&tag=latest"

# Check if contract is verified
curl -X GET "https://api.etherscan.io/api?module=contract&action=getabi&address=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6"
```

### 2. ABI Configuration
```typescript
// Standard ERC-721 ABI (already implemented)
const ABI = ['function balanceOf(address owner) view returns (uint256)'];
```

### 3. Network Configuration
```typescript
// Support multiple networks
const NETWORKS = {
  mainnet: {
    rpc: 'https://cloudflare-eth.com',  // Free, no API key
    contract: '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6'
  },
  mainnet_alchemy: {
    rpc: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    contract: '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6'
  }
};
```

## 🧪 Testing Scenarios

### Scenario 1: Valid Publisher (Genesis Holder)
```typescript
const hasNft = await isnadService.verifyPublisherNft('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
// Returns: true if wallet has Genesis NFT, false otherwise
```

### Scenario 2: Invalid Publisher
```typescript
const hasNft = await isnadService.verifyPublisherNft('0x1234567890123456789012345678901234567890');
// Returns: false (no NFT balance)
```

### Scenario 3: Custom Contract Configuration
```typescript
// Initialize with custom contract addresses
const isnadService = new IsnadService(
  rpcUrl,
  userDataPath,
  '0xCustomPublisherContract',  // Optional: custom publisher NFT
  '0xCustomAuditorContract'     // Optional: custom auditor NFT
);

// Or set via environment variables:
// PUBLISHER_NFT_ADDRESS=0xCustomPublisherContract
// AUDITOR_NFT_ADDRESS=0xCustomAuditorContract
```

### Scenario 4: Network Error Handling
```typescript
const hasNft = await isnadService.verifyPublisherNft('0x...');
// Returns: false on RPC failure (graceful degradation)
```

## 📡 Status Report

### ✅ **What Works:**
- NFT verification using environment variables
- Configurable contract addresses (env vars or constructor params)
- THINK Genesis Bundle as default for beta
- Both publisher and auditor verification
- Proper error handling for network failures
- Logging for debugging and verification
- All TypeScript compilation successful
- Ready for future contract migration

### 🎯 **Beta Configuration:**
```
Contract: THINK Genesis Bundle
Address: 0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
Network: Ethereum Mainnet
RPC: Cloudflare (free) or Alchemy (recommended)
Access: Genesis holders can publish and audit skills
```

### 🚀 **Future Scaling:**
- Deploy custom Publisher NFT contract
- Deploy custom Auditor NFT contract
- Enable $THINK payments for minting
- Update environment variables only
- Gradually migrate users from Genesis to custom contracts

## 🔧 Implementation Details

### Updated Files:
1. `packages/core/src/services/IsnadService.ts`
   - Reads contract addresses from environment variables
   - Supports constructor parameters for programmatic config
   - Falls back to Genesis Bundle address for beta
   - Logs current mode (custom vs Genesis)

2. `packages/core/src/services/AuditRegistry.ts`
   - Same environment variable approach
   - Configurable auditor NFT contract
   - Genesis Bundle default for beta

3. `vercel.json`
   - Updated to use `VITE_*` prefix for frontend env vars

4. `packages/registry/src/index.ts`
   - CORS configured for Vite dev server (localhost:5173)

### Configuration Hierarchy:
```
1. Constructor parameters (highest priority)
2. Environment variables (PUBLISHER_NFT_ADDRESS, AUDITOR_NFT_ADDRESS)
3. GENESIS_CONTRACT environment variable
4. Default Genesis Bundle address (lowest priority)
```

## 🎯 Ready for Real-World Testing

The NFT integration is now complete with flexible configuration:

1. ✅ Verify authors hold NFT (configurable contract)
2. ✅ Verify auditors hold NFT (configurable contract)  
3. ✅ Support for custom contracts (future scaling)
4. ✅ Log verification attempts for debugging
5. ✅ Handle network failures gracefully
6. ✅ Allow testing with mock/dummy addresses
7. ✅ No code changes needed for contract migration

**Next Steps:**
1. Deploy to production with Genesis Bundle
2. Test with real Genesis holders
3. Plan custom contract deployment for scaling
4. Implement $THINK payment integration

**Migration Path:** When ready to scale, simply:
1. Deploy new Publisher/Auditor NFT contracts
2. Update environment variables
3. Restart services
4. Done! ✅
