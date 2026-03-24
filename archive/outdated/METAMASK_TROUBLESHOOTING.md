# MetaMask Not Detected - Troubleshooting Guide

## Quick Solutions

### Option 1: Serve via HTTP (Recommended)
MetaMask doesn't work well with local files (`file://`). Serve the page via HTTP:

**Using Python (if installed):**
```bash
cd ~/OneDrive/Documents/GitHub/TSO
python -m http.server 8080
```
Then open: http://localhost:8080/wallet-verify.html

**Using Node.js:**
```bash
cd ~/OneDrive/Documents/GitHub/TSO
npx http-server -p 8080
```
Then open: http://localhost:8080/wallet-verify.html

**Using Registry API (already built):**
```bash
cd packages/registry
npm run dev
```
Then visit: http://localhost:3000

### Option 2: Use the Live Registry
The deployed registry already has wallet connection built in:
- Visit: https://tso.onrender.com
- Navigate to "Create Agent" → Step 5 (Identity)
- Try connecting your wallet there

### Option 3: Check MetaMask Settings

1. **Open MetaMask** and make sure it's unlocked
2. **Click the 3 dots** (⋮) in MetaMask → **Settings** → **Security & Privacy**
3. **Enable:** "Allow sites to access the Ethereum provider APIs"
4. **Refresh** the wallet-verify.html page

### Option 4: Try a Different Browser
- Chrome: Usually works best
- Brave: Built-in wallet might conflict - disable it
- Firefox: Make sure extension has permission
- Edge: Should work like Chrome

## Debug Steps

I've updated the page with debug logging. After refreshing:

1. **Open Browser Console:** Press `F12` → Click "Console" tab
2. **Click "Show Debug Info"** on the page
3. **Look for messages like:**
   - ✅ "Found ethereum provider"
   - ❌ "window.ethereum is undefined"

### Common Issues

**Issue:** "window.ethereum is undefined"
**Fix:** MetaMask isn't injecting. Try:
- Closing and reopening the browser
- Disabling other wallet extensions (Coinbase Wallet, etc.)
- Using incognito mode with only MetaMask enabled

**Issue:** MetaMask popup doesn't appear
**Fix:** 
- Check if popup blocker is enabled
- Look for MetaMask icon in toolbar with a notification badge
- Try clicking MetaMask icon manually and approve the site

**Issue:** "User rejected request"
**Fix:** Click "Connect" in the MetaMask popup when it appears

## Alternative: Test via Frontend

If the standalone page doesn't work, use the existing frontend:

```bash
cd ~/OneDrive/Documents/GitHub/TSO/tais-frontend
npm install  # if not done
npm run dev
```

Then visit http://localhost:3000/interview and try Step 5 (Identity)

## Last Resort: Manual Verification

If nothing works, let's verify manually via Etherscan:

1. Go to: https://etherscan.io/token/0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
2. Click "Read Contract" tab
3. Find "balanceOf" function
4. Enter your wallet address
5. Click "Query"

If balance > 0, you have the Genesis NFT!

## Need More Help?

Tell me:
1. Which browser are you using?
2. What do you see in the Debug Info section?
3. What errors appear in the browser console (F12)?
