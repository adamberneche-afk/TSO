// Simple MetaMask connection helper
// Handles conflicts with other wallet extensions

export async function connectMetaMask(): Promise<{ address: string; provider: any }> {
  console.log('[Wallet-Simple] Starting connection...');
  
  // Check if we're in a browser
  if (typeof window === 'undefined') {
    console.error('[Wallet-Simple] Not in browser');
    throw new Error('Must be in browser to connect wallet');
  }

  console.log('[Wallet-Simple] Window exists');
  console.log('[Wallet-Simple] window.ethereum:', (window as any).ethereum);

  // Try to find MetaMask specifically
  const ethereum = (window as any).ethereum;
  
  if (!ethereum) {
    console.error('[Wallet-Simple] No ethereum object found');
    throw new Error('No wallet detected. Please install MetaMask from https://metamask.io');
  }

  console.log('[Wallet-Simple] Ethereum object found:', ethereum);
  console.log('[Wallet-Simple] isMetaMask:', ethereum.isMetaMask);
  console.log('[Wallet-Simple] isEternl:', ethereum.isEternl);

  // Check if it's actually MetaMask
  const isMetaMask = ethereum.isMetaMask === true;
  
  if (!isMetaMask) {
    console.error('[Wallet-Simple] Not MetaMask:', ethereum);
    throw new Error('MetaMask not detected. Please make sure MetaMask is installed and unlocked.');
  }

  console.log('[Wallet-Simple] MetaMask confirmed, requesting accounts...');

  try {
    // Request accounts
    const accounts = await ethereum.request({ 
      method: 'eth_requestAccounts'
    });

    console.log('[Wallet-Simple] Accounts received:', accounts);

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts selected in MetaMask');
    }

    console.log('[Wallet-Simple] Connection successful:', accounts[0]);

    return {
      address: accounts[0],
      provider: ethereum
    };
  } catch (error: any) {
    console.error('[Wallet-Simple] Connection error:', error);
    if (error.code === 4001) {
      throw new Error('You rejected the connection request in MetaMask');
    }
    throw new Error(error.message || 'Failed to connect to MetaMask');
  }
}
