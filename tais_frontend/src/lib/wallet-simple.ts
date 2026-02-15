// Simple MetaMask connection helper
// Handles conflicts with other wallet extensions

export async function connectMetaMask(): Promise<{ address: string; provider: any }> {
  console.log('[Wallet-Simple] Starting connection...');
  
  // Check if we're in a browser
  if (typeof window === 'undefined') {
    console.error('[Wallet-Simple] Not in browser');
    throw new Error('Must be in browser to connect wallet');
  }

  // Check for multiple wallet providers (EIP-6963)
  const providers = (window as any).ethereum?.providers;
  
  let metaMaskProvider = null;
  
  if (providers && Array.isArray(providers)) {
    // Multiple wallets installed, find MetaMask specifically
    console.log('[Wallet-Simple] Multiple providers detected:', providers.length);
    metaMaskProvider = providers.find((p: any) => p.isMetaMask && !p.isMagicEden && !p.isEternl);
  } else if ((window as any).ethereum?.isMetaMask) {
    // Single provider that is MetaMask
    metaMaskProvider = (window as any).ethereum;
  }
  
  if (!metaMaskProvider) {
    console.error('[Wallet-Simple] MetaMask not found among providers');
    throw new Error('MetaMask not detected. Please install MetaMask or temporarily disable other wallet extensions (Magic Eden, Eternl, etc.)');
  }

  console.log('[Wallet-Simple] MetaMask provider found');

  try {
    // Request accounts specifically from MetaMask
    console.log('[Wallet-Simple] Requesting accounts from MetaMask...');
    const accounts = await metaMaskProvider.request({ 
      method: 'eth_requestAccounts'
    });

    console.log('[Wallet-Simple] Accounts received:', accounts);

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts selected in MetaMask');
    }

    console.log('[Wallet-Simple] Connection successful:', accounts[0]);

    return {
      address: accounts[0],
      provider: metaMaskProvider
    };
  } catch (error: any) {
    console.error('[Wallet-Simple] Connection error:', error);
    if (error.code === 4001) {
      throw new Error('You rejected the connection request. Please approve the connection in MetaMask (not other wallets).');
    }
    throw new Error(error.message || 'Failed to connect to MetaMask');
  }
}
