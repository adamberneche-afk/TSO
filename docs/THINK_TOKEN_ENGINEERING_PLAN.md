# $THINK Token Integration - Engineering Execution Plan

**Based on:** TAIS Snapshot Staking Protocol v5.0 FINAL  
**Created:** March 5, 2026  
**Timeline:** 2 weeks (10 working days)

---

## Sprint 1: Smart Contract & Infrastructure (Days 1-3)

### Task 1.1: Smart Contract Setup
**Assignee:** Backend/Security  
**Estimate:** 4 hours

- [ ] Create `packages/registry/contracts/` directory
- [ ] Copy `StakingTiers.sol` from spec section 3.1
- [ ] Install OpenZeppelin upgradeable contracts:
  ```bash
  npm install @openzeppelin/contracts-upgradeable
  ```
- [ ] Create Hardhat config or use existing

### Task 1.2: ABI Generation
**Assignee:** Backend  
**Estimate:** 2 hours

- [ ] Compile contract to generate ABI
- [ ] Save ABI to `packages/registry/src/abis/StakingTiers.json`
- [ ] Add Genesis NFT ABI (ERC-721 standard) to `packages/registry/src/abis/GenesisNFT.json`

### Task 1.3: Environment Configuration
**Assignee:** DevOps  
**Estimate:** 1 hour

Add to `packages/registry/.env`:
```env
# Ethereum
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=... (deployer only - keep secure!)

# Contracts
STAKING_CONTRACT_ADDRESS=0x... (to be filled after deployment)
THINK_TOKEN_ADDRESS=0xF9ff95468cb9A0cD57b8542bbc4c148e290Ff465
GENESIS_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
```

### Task 1.4: Testnet Deployment & Testing
**Assignee:** Backend  
**Estimate:** 4 hours

- [ ] Deploy to Sepolia testnet
- [ ] Test `stake()` function
- [ ] Test `unstake()` function
- [ ] Test `getTier()` function
- [ ] Test Genesis NFT holder detection

### Task 1.5: Mainnet Deployment
**Assignee:** Backend  
**Estimate:** 2 hours

- [ ] Deploy StakingTiers proxy to Ethereum mainnet
- [ ] Verify on Etherscan
- [ ] Transfer ownership to multisig (if set up)
- [ ] Update `STAKING_CONTRACT_ADDRESS` in `.env`

---

## Sprint 2: Backend Services (Days 3-5)

### Task 2.1: TierService Implementation
**Assignee:** Backend  
**Estimate:** 4 hours

Create `packages/registry/src/services/tierService.ts`:

```typescript
// Key methods to implement from spec section 6.1:
- getUserTier(walletAddress: string): Promise<number>
- getAccountStatus(address: string): Promise<AccountStatus>
- isGenesisHolder(address: string): Promise<boolean>
- invalidateCache(address: string): void
```

- [ ] Implement TierService class with ethers.js
- [ ] Add 1-hour cache with Map
- [ ] Add error handling and fallbacks

### Task 2.2: Database Schema Updates
**Assignee:** Backend  
**Estimate:** 2 hours

Update `packages/registry/prisma/schema.prisma`:

```prisma
model User {
  // ... existing fields
  tier              Int      @default(0)  // 0=Free, 1=Bronze, 2=Silver, 3=Gold
  subscriptionStatus String?  // 'active', 'canceled', null
  subscriptionTier  String?  // 'bronze', 'silver', 'gold'
  subscriptionId    String?  // Stripe subscription ID
}
```

- [ ] Add migration for new fields
- [ ] Run migration

### Task 2.3: Tier API Routes
**Assignee:** Backend  
**Estimate:** 3 hours

Create `packages/registry/src/routes/tier.ts`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tier/:address` | Get user's tier |
| GET | `/api/v1/tier/:address/status` | Full account status |
| GET | `/api/v1/tier/price` | Current THINK price |

- [ ] Create routes
- [ ] Register in `index.ts`
- [ ] Add rate limiting
- [ ] Test endpoints

---

## Sprint 3: Stripe Integration (Days 5-6)

### Task 3.1: Stripe Setup
**Assignee:** Payments/DevOps  
**Estimate:** 2 hours

- [ ] Create Stripe account (if not exists)
- [ ] Create products:
  - Bronze: $5/month (price_xxx)
  - Silver: $50/month (price_xxx)
  - Gold: $1,000/month (price_xxx)
- [ ] Configure webhook endpoint
- [ ] Get API keys

### Task 3.2: SubscriptionService
**Assignee:** Backend  
**Estimate:** 4 hours

Create `packages/registry/src/services/subscriptionService.ts`:

```typescript
// Key methods:
- createCheckoutSession(userId, tier): Promise<CheckoutSession>
- handleWebhook(event): Promise<void>
- cancelSubscription(subscriptionId): Promise<void>
- getSubscriptionStatus(userId): Promise<SubscriptionStatus>
```

- [ ] Implement Stripe integration
- [ ] Add webhook signature verification
- [ ] Implement retry logic for failures

### Task 3.3: Subscription API Routes
**Assignee:** Backend  
**Estimate:** 3 hours

Create `packages/registry/src/routes/subscriptions.ts`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/subscriptions/checkout` | Create Stripe checkout |
| POST | `/api/v1/subscriptions/webhook` | Handle Stripe webhooks |
| DELETE | `/api/v1/subscriptions` | Cancel subscription |
| GET | `/api/v1/subscriptions/status` | Get subscription status |

- [ ] Create routes
- [ ] Register in `index.ts`
- [ ] Test with Stripe CLI

---

## Sprint 4: Frontend - Core (Days 7-9)

### Task 4.1: API Client Updates
**Assignee:** Frontend  
**Estimate:** 2 hours

Create `tais_frontend/src/services/tierApi.ts`:
```typescript
// Methods:
- getUserTier(address: string): Promise<number>
- getAccountStatus(address: string): Promise<AccountStatus>
- getThinkPrice(): Promise<number>
```

Create `tais_frontend/src/services/subscriptionApi.ts`:
```typescript
// Methods:
- createCheckout(tier: string): Promise<{url: string}>
- cancelSubscription(): Promise<void>
- getSubscriptionStatus(): Promise<SubscriptionStatus>
```

### Task 4.2: Staking UI Component
**Assignee:** Frontend  
**Estimate:** 6 hours

Create `tais_frontend/src/app/components/staking/StakingPage.tsx`:

**Features:**
- Show current tier (with badge)
- Show staked THINK balance
- Show USD value equivalent
- Stake input + button
- Unstake input + button
- "Preview tier after unstake" warning
- Genesis NFT indicator

**Layout┌─────────────────────────────────────┐
│:**
```
  Your Tier: GOLD                    │
│  (via Genesis NFT)                  │
├─────────────────────────────────────┤
│  Staked: 0 THINK                    │
│  Value: $0.00 USD                   │
├─────────────────────────────────────┤
│  [Stake THINK]  [Unstake THINK]     │
├─────────────────────────────────────┤
│  Tier Thresholds:                   │
│  Bronze: $500  → 980,392 THINK     │
│  Silver: $6,000 → 11,764,706 THINK  │
│  Gold: $30,000 → 58,823,529 THINK   │
└─────────────────────────────────────┘
```

- [ ] Create component
- [ ] Add wallet connection
- [ ] Implement stake/unstake calls (via wallet)
- [ ] Add loading states
- [ ] Add error handling

### Task 4.3: Subscription UI Component
**Assignee:** Frontend  
**Estimate:** 5 hours

Create `tais_frontend/src/app/components/subscriptions/SubscriptionPage.tsx`:

**Features:**
- Show current subscription status
- Plan comparison table
- Subscribe buttons (redirect to Stripe)
- Cancel subscription button
- Billing history link

**Layout:**
```
┌─────────────────────────────────────┐
│  Current Plan: Free                 │
├─────────────────────────────────────┤
│  Compare Plans:                     │
│  ┌─────────┬─────────┬─────────┐   │
│  │ Bronze  │ Silver  │  Gold   │   │
│  │  $5/mo  │ $50/mo  │$1,000/mo│   │
│  │ [Select]│ [Select]│ [Select]│   │
│  └─────────┴─────────┴─────────┘   │
├─────────────────────────────────────┤
│  [Cancel Subscription]             │
└─────────────────────────────────────┘
```

- [ ] Create component
- [ ] Integrate Stripe checkout redirect
- [ ] Add loading states

### Task 4.4: Navigation Updates
**Assignee:** Frontend  
**Estimate:** 1 hour

- [ ] Add "Staking" link to navigation
- [ ] Add "Subscription" link to navigation (or combine with Staking)
- [ ] Update routes in App.tsx

---

## Sprint 5: Frontend - Integration (Days 9-10)

### Task 5.1: Tier Display Updates
**Assignee:** Frontend  
**Estimate:** 3 hours

- [ ] Update header to show current tier
- [ ] Update GoldTierDashboard - add "via Stripe" or "via Genesis" indicator
- [ ] Update upgrade prompts - link to Staking/Subscription pages

### Task 5.2: Wallet Integration
**Assignee:** Frontend  
**Estimate:** 2 hours

- [ ] Ensure wallet address available for API calls
- [ ] Handle wallet change - refresh tier
- [ ] Handle chain change - prompt reconnect

### Task 5.3: Error Handling & Edge Cases
**Assignee:** Frontend  
**Estimate:** 2 hours

- [ ] Handle "price stale" error
- [ ] Handle "insufficient balance" error
- [ ] Handle Stripe failures
- [ ] Handle wallet rejection

---

## Sprint 6: Testing & Polish (Days 11-14)

### Task 6.1: Unit Tests
**Assignee:** Backend  
**Estimate:** 3 hours

- [ ] Test TierService.getUserTier()
- [ ] Test TierService.getAccountStatus()
- [ ] Test SubscriptionService.createCheckout()
- [ ] Test webhook handling

### Task 6.2: Integration Tests
**Assignee:** Backend  
**Estimate:** 3 hours

- [ ] Test stake flow end-to-end
- [ ] Test subscription flow end-to-end
- [ ] Test tier downgrade on unstake
- [ ] Test Genesis holder detection

### Task 6.3: E2E Tests
**Assignee:** QA  
**Estimate:** 3 hours

- [ ] Create Playwright/Cypress tests
- [ ] Test complete staking flow
- [ ] Test complete subscription flow
- [ ] Test tier verification

### Task 6.4: Documentation Updates
**Assignee:** Tech Writer  
**Estimate:** 2 hours

- [ ] Update API.md with new endpoints
- [ ] Update README.md
- [ ] Add user guide for Staking
- [ ] Add user guide for Subscriptions

### Task 6.5: Deployment
**Assignee:** DevOps  
**Estimate:** 2 hours

- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Verify environment variables
- [ ] Test in production

---

## File Checklist

### New Files (Backend)
```
packages/registry/
├── contracts/
│   └── StakingTiers.sol
├── src/
│   ├── abis/
│   │   ├── StakingTiers.json
│   │   └── GenesisNFT.json
│   ├── services/
│   │   ├── tierService.ts
│   │   └── subscriptionService.ts
│   └── routes/
│       ├── tier.ts
│       └── subscriptions.ts
└── scripts/
    └── migrateGenesis.ts
```

### New Files (Frontend)
```
tais_frontend/src/
├── services/
│   ├── tierApi.ts
│   └── subscriptionApi.ts
└── app/
    └── components/
        ├── staking/
        │   └── StakingPage.tsx
        └── subscriptions/
            └── SubscriptionPage.tsx
```

### Modified Files
```
packages/registry/
├── prisma/schema.prisma (add tier fields)
├── src/index.ts (register new routes)
└── .env (add new variables)

tais_frontend/
└── src/app/App.tsx (add routes)
```

---

## Dependencies & Prerequisites

### Before Starting
- [ ] Stripe account created
- [ ] Infura project created (for RPC_URL)
- [ ] Deployer wallet has ETH for gas
- [ ] Multisig set up (optional)

### npm Packages Needed
```bash
# Backend
npm install ethers@5 @stripe/stripe-js

# Frontend  
npm install @stripe/stripe-js
```

---

## Success Metrics

- [ ] Users can view their tier
- [ ] Users can stake/unstake THINK
- [ ] Users can subscribe via Stripe
- [ ] Genesis holders get Gold tier automatically
- [ ] Tier changes reflect within 1 hour
- [ ] All API endpoints return correct data
- [ ] Frontend shows accurate tier information
- [ ] Deployment completes without errors

---

## Rollback Plan

If issues occur:
1. **Smart Contract:** Contract is upgradeable - can fix bugs via proxy
2. **Backend:** Can revert to previous version via Git
3. **Stripe:** Can disable subscription links, existing subscribers remain active
4. **Frontend:** Can revert to previous version via Vercel

---

## Notes

- Price oracle is manual (foundation updates) - implement Chainlink in v2
- Tier is locked at stake time - only re-evaluates on threshold cross
- Genesis NFT holders are permanent Gold (even if they unstake all)
- Fiat subscriptions can be canceled but tier remains until period ends
