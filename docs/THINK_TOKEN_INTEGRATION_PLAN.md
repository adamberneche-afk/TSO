# $THINK Token Integration - Implementation Plan

**Based on:** TAIS Snapshot Staking Protocol v5.0 FINAL (Feb 28, 2026)  
**Status:** Ready for Engineering  
**Estimated Timeline:** 2 weeks

---

## Contract Addresses (Confirmed)

| Contract | Address |
|----------|---------|
| $THINK Token | `0xF9ff95468cb9A0cD57b8542bbc4c148e290Ff465` |
| Genesis NFT | `0x11B3EfbF04F0bA505F380aC20444B6952970AdA6` |
| StakingTiers | `[TO BE DEPLOYED]` |

---

## Tier Structure

### Token Staking (USD-Pegged)
| Tier | USD Value | THINK Required (@ $0.00051) |
|------|-----------|------------------------------|
| Bronze | $500 | 980,392 THINK |
| Silver | $6,000 | 11,764,706 THINK |
| Gold | $30,000 | 58,823,529 THINK |

### Fiat Subscriptions (Stripe)
| Tier | Monthly | Yearly |
|------|---------|--------|
| Bronze | $5 | $60 |
| Silver | $50 | $600 |
| Gold | $1,000 | $12,000 |

### Genesis NFT (Existing)
- Permanent Gold tier (forever)
- One-time ~$53 (0.0177 ETH)
- Tradeable on OpenSea
- **760 current holders**

---

## Implementation Phases

### Phase 1: Smart Contract Deployment (Day 1)

**Team:** Backend/Security

**Tasks:**
- [ ] Deploy StakingTiers proxy to Ethereum mainnet
- [ ] Verify contract on Etherscan
- [ ] Transfer ownership to multisig (3-of-5)
- [ ] Test stake/unstake functions on testnet first
- [ ] Configure environment variables

**Files:**
- `packages/registry/contracts/StakingTiers.sol` (NEW)
- `packages/registry/contracts/abis/StakingTiers.json` (NEW)

**Dependencies:**
- Deployer wallet with ETH for gas
- Multisig setup

---

### Phase 2: Genesis Migration (Day 2)

**Team:** Backend

**Tasks:**
- [ ] Run holder snapshot script to find all 760 holders
- [ ] Execute batch `batchSetGenesisStatus()` (50 at a time)
- [ ] Verify migration completeness
- [ ] Set manual overrides for any special cases

**Files:**
- `packages/registry/scripts/migrateGenesis.ts` (NEW)

**Dependencies:**
- Phase 1 complete

---

### Phase 3: Backend Integration (Days 3-4)

**Team:** Backend

**Tasks:**

1. **Tier Service**
   - [ ] Create `packages/registry/src/services/tierService.ts`
   - [ ] Implement `getUserTier()` - checks staking contract + DB + Genesis
   - [ ] Implement `getAccountStatus()` - full staking info
   - [ ] Add caching (1 hour TTL)

2. **API Routes**
   - [ ] Create `packages/registry/src/routes/tier.ts`
   - `GET /api/v1/tier/:address` - Get user's tier
   - `GET /api/v1/tier/:address/status` - Full account status
   - `GET /api/v1/tier/price` - Current THINK price

3. **Database Updates**
   - [ ] Add `tier` field to User model
   - [ ] Add `subscriptionStatus` field
   - [ ] Add `subscriptionTier` field (for fiat)
   - [ ] Run migration

4. **Web3 Integration**
   - [ ] Add RPC_URL to environment
   - [ ] Add STAKING_CONTRACT_ADDRESS to environment
   - [ ] Test contract reads

**Files:**
- `packages/registry/src/services/tierService.ts` (NEW)
- `packages/registry/src/routes/tier.ts` (NEW)
- `packages/registry/prisma/schema.prisma` (UPDATE)
- `packages/registry/.env` (UPDATE)

**Dependencies:**
- Phase 1 + 2 complete

---

### Phase 4: Fiat Subscription (Stripe) (Days 4-5)

**Team:** Backend + Payments

**Tasks:**

1. **Stripe Setup**
   - [ ] Create Stripe products: Bronze ($5), Silver ($50), Gold ($1,000)
   - [ ] Configure webhook endpoint
   - [ ] Set up customer portal

2. **Subscription Service**
   - [ ] Create `packages/registry/src/services/subscriptionService.ts`
   - [ ] Implement `createCheckoutSession()`
   - [ ] Implement `handleWebhook()` - sync subscription status
   - [ ] Implement `cancelSubscription()`

3. **API Routes**
   - [ ] `POST /api/v1/subscriptions/checkout` - Create Stripe checkout
   - [ ] `POST /api/v1/subscriptions/webhook` - Handle Stripe webhooks
   - [ ] `DELETE /api/v1/subscriptions` - Cancel subscription
   - [ ] `GET /api/v1/subscriptions/status` - Get subscription status

**Files:**
- `packages/registry/src/services/subscriptionService.ts` (NEW)
- `packages/registry/src/routes/subscriptions.ts` (NEW)

**Dependencies:**
- Phase 3 complete
- Stripe account configured

---

### Phase 5: Frontend Integration (Days 6-10)

**Team:** Frontend

**Tasks:**

1. **Staking UI**
   - [ ] Create `tais_frontend/src/app/components/staking/StakingPage.tsx`
   - [ ] Show current tier
   - [ ] Show staked balance
   - [ ] Stake/unstake buttons (calls contract via wallet)
   - [ ] Preview tier after unstake

2. **Subscription UI**
   - [ ] Create `tais_frontend/src/app/components/subscriptions/SubscriptionPage.tsx`
   - [ ] Show current subscription
   - [ ] Plan selection (Bronze/Silver/Gold)
   - [ ] Stripe checkout integration
   - [ ] Cancel subscription button

3. **Dashboard Updates**
   - [ ] Update GoldTierDashboard - show staking info
   - [ ] Update tier verification logic
   - [ ] Show "Upgrade to Gold" CTA for non-members

4. **API Integration**
   - [ ] Add tier API functions to `tais_frontend/src/services/tierApi.ts`
   - [ ] Add subscription API functions to `tais_frontend/src/services/subscriptionApi.ts`

**Files:**
- `tais_frontend/src/app/components/staking/StakingPage.tsx` (NEW)
- `tais_frontend/src/app/components/subscriptions/SubscriptionPage.tsx` (NEW)
- `tais_frontend/src/services/tierApi.ts` (NEW)
- `tais_frontend/src/services/subscriptionApi.ts` (NEW)
- `tais_frontend/src/app/App.tsx` (UPDATE - add routes)

**Dependencies:**
- Phase 3 + 4 complete

---

### Phase 6: Testing & Deployment (Days 11-14)

**Team:** All

**Tasks:**

1. **Testing**
   - [ ] Unit tests for TierService
   - [ ] Unit tests for SubscriptionService
   - [ ] Integration tests for API routes
   - [ ] E2E tests for staking flow
   - [ ] E2E tests for subscription flow

2. **Security**
   - [ ] Code review
   - [ ] Verify contract on Etherscan
   - [ ] Environment variable audit

3. **Deployment**
   - [ ] Deploy backend to production
   - [ ] Deploy frontend to production
   - [ ] Monitor for issues

4. **Documentation**
   - [ ] Update API.md
   - [ ] Update README.md
   - [ ] Create user guides

---

## Environment Variables Required

```env
# Ethereum
RPC_URL=https://mainnet.infura.io/v3/...
PRIVATE_KEY=... (deployer only)

# Contracts
STAKING_CONTRACT_ADDRESS=0x... (after deployment)
THINK_TOKEN_ADDRESS=0xF9ff95468cb9A0cD57b8542bbc4c148e290Ff465
GENESIS_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BRONZE_PRICE_ID=price_...
STRIPE_SILVER_PRICE_ID=price_...
STRIPE_GOLD_PRICE_ID=price_...
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tier/:address` | Get user's effective tier |
| GET | `/api/v1/tier/:address/status` | Full staking account status |
| GET | `/api/v1/tier/price` | Current THINK price |
| POST | `/api/v1/subscriptions/checkout` | Create Stripe checkout |
| POST | `/api/v1/subscriptions/webhook` | Handle Stripe webhooks |
| DELETE | `/api/v1/subscriptions` | Cancel subscription |
| GET | `/api/v1/subscriptions/status` | Get subscription status |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Smart contract bug | Deploy to testnet first, security audit |
| Price oracle stale | 24-hour staleness check, manual override |
| Genesis migration incomplete | Verify holder count after migration |
| Stripe webhook failure | Retry logic, reconciliation job |
| Frontend wallet issues | Test with multiple wallets |

---

## Success Criteria

- [ ] Staking contract deployed and verified
- [ ] 760 Genesis holders migrated
- [ ] Tier API responding correctly
- [ ] Stripe subscriptions working
- [ ] Frontend shows correct tier
- [ ] Users can stake/unstake
- [ ] Users can subscribe via Stripe

---

## Timeline Summary

| Phase | Days | Cumulative |
|-------|------|------------|
| Smart Contract | 1 | Day 1 |
| Genesis Migration | 1 | Day 2 |
| Backend Integration | 2 | Day 4 |
| Stripe Subscription | 1 | Day 5 |
| Frontend Integration | 5 | Day 10 |
| Testing & Deployment | 4 | Day 14 |

**Total: 2 weeks**
