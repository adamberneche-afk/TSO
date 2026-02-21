# Sprint 1: End-to-End Testing Plan
**Sprint:** February 13-20, 2026  
**Goal:** Verify complete configuration persistence workflow
**Status:** IN PROGRESS

---

## Test Environment

**Backend:** https://tso.onrender.com  
**Frontend:** https://taisplatform.vercel.app  
**Database:** PostgreSQL (tais_registry)  
**Test Wallet:** Required for authentication flow

---

## Test Scenarios

### Scenario 1: Configuration Save with Authenticated Wallet
**Priority:** CRITICAL  
**Type:** End-to-End

**Steps:**
1. Open https://taisplatform.vercel.app
2. Navigate through Interview Wizard
3. Connect MetaMask wallet at Identity step
4. Complete all wizard steps to ConfigPreview
5. Click "Save Configuration" button
6. Verify success message
7. Verify configuration appears in database

**Expected Results:**
- Wallet connection successful
- Configuration saves to database
- API returns 201 Created
- User sees success confirmation
- Configuration appears in user's config list

---

### Scenario 2: NFT Ownership Validation
**Priority:** CRITICAL  
**Type:** API + Frontend Integration

**Steps:**
1. Test with wallet holding Genesis NFT
   - Verify can save up to 2 configurations
   - Verify accurate NFT count displayed
   
2. Test with wallet NOT holding Genesis NFT
   - Attempt to save configuration
   - Verify appropriate error message
   - Verify CTA to purchase NFT

**Expected Results:**
- NFT holders: Can save 2 configs per token
- Non-holders: Clear error with purchase link
- API returns 403 with descriptive error

---

### Scenario 3: Rate Limiting Enforcement
**Priority:** HIGH  
**Type:** API Load Testing

**Steps:**
1. Make 500+ authenticated requests to /api/v1/configurations
2. Verify rate limit kicks in at appropriate threshold
3. Check rate limit headers in responses
4. Test different rate limit tiers

**Expected Results:**
- 429 Too Many Requests after limit
- Proper X-RateLimit headers
- Authenticated tier: 500 req/15min
- Reset after window expires

---

### Scenario 4: Error Handling Paths
**Priority:** HIGH  
**Type:** Negative Testing

**Test Cases:**
1. **No Wallet Connected**
   - Attempt API call without JWT
   - Expected: 401 Authentication required

2. **Invalid JWT Token**
   - Send request with expired/invalid token
   - Expected: 401 Token invalid

3. **Missing Required Fields**
   - POST config without name
   - Expected: 400 Validation failed

4. **Config Name Too Long**
   - Submit name > 100 characters
   - Expected: 400 Name too long

5. **Database Connection Failure**
   - Test graceful degradation
   - Expected: 500 with safe error message

**Expected Results:**
- All errors return proper HTTP status codes
- Error messages are user-friendly
- No sensitive data leaked
- Frontend handles errors gracefully

---

### Scenario 5: Configuration Lifecycle
**Priority:** MEDIUM  
**Type:** CRUD Operations

**Steps:**
1. **Create** - Save new configuration
2. **Read** - Retrieve configuration list
3. **Update** - Modify existing configuration
4. **Delete** - Soft delete configuration
5. **Verify** - Confirm deletion in database

**Expected Results:**
- All CRUD operations work via API
- Soft delete sets isActive=false
- Updates increment version number
- List returns only active configs

---

## Test Data Requirements

### Test Wallets Needed:
1. **Wallet A** - Holds 1 Genesis NFT
   - Should be able to save 2 configurations
   - Address: [To be filled during testing]

2. **Wallet B** - Holds 0 Genesis NFTs
   - Should be denied configuration save
   - Address: [To be filled during testing]

3. **Wallet C** - Holds 3 Genesis NFTs
   - Should be able to save 6 configurations
   - Address: [To be filled during testing]

### Test Configurations:
```json
{
  "name": "Test Config 1",
  "description": "E2E test configuration",
  "configData": {
    "skills": ["skill1", "skill2"],
    "agentName": "TestAgent",
    "description": "Test description"
  }
}
```

---

## Success Criteria

- [ ] User can save configuration through frontend
- [ ] Configuration appears in database
- [ ] NFT holders get 2 config slots per token
- [ ] Non-holders receive appropriate error
- [ ] Rate limits prevent abuse
- [ ] All error paths return proper responses
- [ ] No sensitive data in error messages
- [ ] < 200ms average API response time

---

## Issue Tracking

| ID | Issue | Severity | Status | Notes |
|----|-------|----------|--------|-------|
|  |  |  |  |  |

---

## Documentation

- Update WIP_V2.txt with test results
- Document any bugs in GitHub Issues
- Update API docs if endpoints changed
- Create testing guide for future reference

---

**Start Date:** February 13, 2026  
**Target Completion:** February 20, 2026  
**Owner:** Development Team
