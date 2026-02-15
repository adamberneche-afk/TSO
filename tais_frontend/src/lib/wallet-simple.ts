// Simple MetaMask connection helper
// Handles conflicts with other wallet extensions

export async function connectMetaMask(): Promise<{ address: string; provider: any }> {
  // Check if we're in a browser
  if (typeof window === 'undefined') {
    throw new Error('Must be in browser to connect wallet');
  }

  // Try to find MetaMask specifically
  const ethereum = (window as any).ethereum;
  
  if (!ethereum) {
    throw new Error('No wallet detected. Please install MetaMask from https://metamask.io');
  }

  // Check if it's actually MetaMask (not Eternl or other wallets)
  const isMetaMask = ethereum.isMetaMask && !ethereum.isEternl;
  
  if (!isMetaMask) {
    console.log('Detected non-MetaMask wallet:', ethereum);
    throw new Error('Please use MetaMask. Other wallet extensions may interfere. Try disabling other wallet extensions temporarily.');
  }

  try {
    // Request accounts
    console.log('Requesting MetaMask accounts...');
    const accounts = await ethereum.request({ 
      method: 'eth_requestAccounts',
      params: []
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts selected in MetaMask');
    }

    return {
      address: accounts[0],
      provider: ethereum
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('You rejected the connection request in MetaMask');
    }
    throw new Error(error.message || 'Failed to connect to MetaMask');
  }
}
