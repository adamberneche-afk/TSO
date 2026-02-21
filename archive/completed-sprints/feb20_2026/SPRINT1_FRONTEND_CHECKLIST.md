# Sprint 1: Frontend Manual Testing Checklist
**Use this checklist when testing the frontend at https://taisplatform.vercel.app**

---

## Pre-Test Setup

### Required:
- [ ] MetaMask browser extension installed
- [ ] Test wallet with Genesis NFT (if testing holder flow)
- [ ] Test wallet without Genesis NFT (if testing non-holder flow)
- [ ] Access to Render logs (for debugging)

### Test Wallets:
- **Holder Wallet:** _________________ (Address)
- **Non-Holder Wallet:** _________________ (Address)

---

## Test Case 1: Basic Flow Without Wallet
**Goal:** Verify UI works without authentication

### Steps:
1. [ ] Open https://taisplatform.vercel.app
2. [ ] Verify landing page loads correctly
3. [ ] Check OpenSea CTA is visible
4. [ ] Click "Launch Interview"
5. [ ] Verify Interview Wizard opens
6. [ ] Complete steps 1-4 (Agent Info, Skills, Permissions, Identity)
7. [ ] At Identity step, **SKIP** wallet connection
8. [ ] Verify Review step loads
9. [ ] Check JSON preview displays correctly
10. [ ] Verify Monaco Editor works (syntax highlighting, etc.)

### Expected Results:
- [ ] Landing page displays Genesis collection stats
- [ ] Interview Wizard progresses smoothly
- [ ] Skills load from API (3 demo skills)
- [ ] Review step shows configuration without wallet
- [ ] Monaco Editor displays formatted JSON

### Actual Results:
```
Status: 
Issues Found: 
Notes: 
```

---

## Test Case 2: Wallet Connection Flow
**Goal:** Verify MetaMask integration works

### Steps:
1. [ ] Navigate to Interview Wizard
2. [ ] Go to Identity step
3. [ ] Click "Connect MetaMask"
4. [ ] Approve connection in MetaMask popup
5. [ ] Verify wallet address displays (0x... format)
6. [ ] Verify green "Connected" indicator
7. [ ] Check Genesis holder benefits shown
8. [ ] Click "Disconnect"
9. [ ] Verify disconnected state
10. [ ] Reconnect wallet

### Expected Results:
- [ ] MetaMask popup appears
- [ ] Address displays after connection
- [ ] Green pulse animation shows
- [ ] Benefits list visible
- [ ] Disconnect works
- [ ] Reconnection works

### Actual Results:
```
Status: 
Wallet Address: 
Connection Time: 
Issues Found: 
Notes: 
```

---

## Test Case 3: Configuration Save - NFT Holder
**Goal:** Verify holder can save configurations

### Prerequisites:
- Wallet with Genesis NFT connected

### Steps:
1. [ ] Connect wallet with NFT at Identity step
2. [ ] Complete wizard to Review step
3. [ ] Click "Save Configuration" button
4. [ ] Wait for API response
5. [ ] Verify success message appears
6. [ ] Check configuration saved to database
7. [ ] Verify config appears in user's list
8. [ ] Save second configuration
9. [ ] Verify both configs visible
10. [ ] Attempt to save third configuration
11. [ ] Verify limit error shown

### Expected Results:
- [ ] Save button triggers API call
- [ ] Success message displayed
- [ ] Config saved in database
- [ ] 2 configurations allowed per NFT
- [ ] Third config shows limit error
- [ ] Error message is user-friendly

### Actual Results:
```
Status: 
NFTs Held: 
Configs Saved: 
API Response Time: 
Issues Found: 
Notes: 
```

**API Response (check browser Network tab):**
```json
{
  "timestamp": "",
  "status": "",
  "response": ""
}
```

---

## Test Case 4: Configuration Save - Non-Holder
**Goal:** Verify non-holder gets appropriate error

### Prerequisites:
- Wallet without Genesis NFT connected

### Steps:
1. [ ] Connect wallet without NFT at Identity step
2. [ ] Complete wizard to Review step
3. [ ] Click "Save Configuration"
4. [ ] Wait for API response
5. [ ] Verify error message appears
6. [ ] Check error message includes OpenSea link
7. [ ] Verify CTA to purchase NFT

### Expected Results:
- [ ] API returns 403 Forbidden
- [ ] Error message shown to user
- [ ] Message explains NFT requirement
- [ ] Link to OpenSea provided
- [ ] Clear path to resolve (buy NFT)

### Actual Results:
```
Status: 
Error Message: 
HTTP Status: 
Issues Found: 
Notes: 
```

---

## Test Case 5: Configuration Management
**Goal:** Verify CRUD operations work

### Steps:
1. [ ] Save a new configuration
2. [ ] Note the configuration ID
3. [ ] Click "My Configurations" (if available)
4. [ ] Verify config appears in list
5. [ ] Click "Edit" on saved config
6. [ ] Modify name or description
7. [ ] Save changes
8. [ ] Verify changes persisted
9. [ ] Click "Delete" on config
10. [ ] Confirm deletion
11. [ ] Verify config no longer appears

### Expected Results:
- [ ] Config appears after save
- [ ] Edit updates config
- [ ] Version number increments on edit
- [ ] Delete soft-deletes (isActive=false)
- [ ] Deleted config not in list

### Actual Results:
```
Status: 
Config ID: 
Edit Success: 
Delete Success: 
Issues Found: 
Notes: 
```

---

## Test Case 6: Error Handling
**Goal:** Verify graceful error handling

### Test Scenarios:

#### 6a: Network Error
1. [ ] Disconnect internet
2. [ ] Try to save configuration
3. [ ] Verify error message
4. [ ] Reconnect internet
5. [ ] Retry save

#### 6b: Invalid Input
1. [ ] Try to save with name > 100 characters
2. [ ] Try to save with description > 500 characters
3. [ ] Try to save with empty name
4. [ ] Verify validation errors

#### 6c: Server Error
1. [ ] Save configuration
2. [ ] Check error handling if server fails
3. [ ] Verify retry option available

### Expected Results:
- [ ] Network errors show friendly message
- [ ] Validation errors displayed inline
- [ ] Server errors show retry option
- [ ] No sensitive data in error messages

### Actual Results:
```
Network Error Handling: 
Validation Error Handling: 
Server Error Handling: 
Issues Found: 
```

---

## Test Case 7: Rate Limiting
**Goal:** Verify rate limits enforced

### Steps:
1. [ ] Open browser console (F12)
2. [ ] Connect wallet
3. [ ] Rapidly click "Save Configuration" 10+ times
4. [ ] Check Network tab for 429 responses
5. [ ] Verify rate limit headers
6. [ ] Wait for rate limit window
7. [ ] Try again

### Expected Results:
- [ ] Rate limit headers present
- [ ] 429 status after limit reached
- [ ] User-friendly rate limit message
- [ ] Retry-After header present
- [ ] Can retry after window expires

### Actual Results:
```
Requests Made: 
429 Responses: 
Rate Limit Message: 
Retry Time: 
Issues Found: 
```

---

## Test Case 8: Landing Page Features
**Goal:** Verify Genesis holder CTAs work

### Steps:
1. [ ] Open landing page
2. [ ] Verify OpenSea link clickable
3. [ ] Check Genesis collection stats display
4. [ ] Verify "Publish Skills" section visible
5. [ ] Verify "Audit Skills" section visible
6. [ ] Click "Publish Skills" CTA
7. [ ] Verify navigates to correct page

### Expected Results:
- [ ] OpenSea link works
- [ ] Stats accurate (supply, floor, volume)
- [ ] Token holder features highlighted
- [ ] CTAs navigate correctly

### Actual Results:
```
Status: 
OpenSea Link Works: 
Stats Displayed: 
CTAs Functional: 
Issues Found: 
```

---

## Test Data to Record

### Performance Metrics:
- Page Load Time: _____ ms
- API Response Time (avg): _____ ms
- Configuration Save Time: _____ ms

### Browser Info:
- Browser: _______________
- Version: _______________
- MetaMask Version: _______________

### Wallet Info:
- Holder Wallet: _______________
- Non-Holder Wallet: _______________
- Network: _______________

---

## Issues Found

| ID | Description | Severity | Screenshot | Notes |
|----|-------------|----------|------------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Sign-Off

**Tester Name:** _________________  
**Date:** _________________  
**Overall Status:** ☐ PASS ☐ FAIL ☐ PARTIAL

**Summary:**
```

```

**Blockers (if any):**
```

```

---

## Quick Debug Commands

If issues occur, check these:

1. **Backend Health:**
   ```bash
   curl https://tso.onrender.com/health
   ```

2. **Database Connection:**
   - Check Render dashboard logs

3. **CORS Issues:**
   ```bash
   curl -H "Origin: https://taisplatform.vercel.app" \
        -H "Access-Control-Request-Method: POST" \
        -X OPTIONS \
        https://tso.onrender.com/api/v1/configurations
   ```

4. **API Authentication:**
   ```bash
   curl https://tso.onrender.com/api/v1/configurations/status
   # Should return 401
   ```

---

**Document Version:** 1.0  
**Last Updated:** February 13, 2026  
**Test Against:** https://taisplatform.vercel.app
