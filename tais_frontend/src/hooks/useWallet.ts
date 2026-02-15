// TAIS Platform - Wallet Connection Hook

import { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import registryClient from '../lib/registry-client';
import { authApi } from '../services/authApi';
import { toast } from 'sonner';

interface UseWalletReturn {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  hasGenesisNFT: boolean;
  checkGenesisNFT: () => Promise<boolean>;
}

const GENESIS_CONTRACT = '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';

// Simple ABI for balanceOf function
const GENESIS_ABI = [
  'function balanceOf(address owner) view returns (uint256)'
];

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet(): UseWalletReturn {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenesisNFT, setHasGenesisNFT] = useState(false);

  const checkGenesisNFT = async (walletAddress?: string): Promise<boolean> => {
    try {
      if (!window.ethereum || !walletAddress) return false;

      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(GENESIS_CONTRACT, GENESIS_ABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      const hasNFT = balance > 0n;
      
      setHasGenesisNFT(hasNFT);
      return hasNFT;
    } catch (err) {
      console.error('Failed to check Genesis NFT:', err);
      return false;
    }
  };

  const connect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask to connect your wallet.');
      }

      console.log('[Wallet] Requesting accounts from MetaMask...');
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      console.log('[Wallet] Accounts received:', accounts);
      
      if (accounts.length === 0) {
        throw new Error('No accounts selected. Please select an account in MetaMask.');
      }

      const walletAddress = accounts[0];
      console.log('[Wallet] Selected address:', walletAddress);
      
      // Step 1: Get nonce from backend
      console.log('[Wallet] Getting nonce from backend...');
      toast.info('Authenticating...', { description: 'Getting authentication nonce' });
      const { nonce, message } = await authApi.getNonce(walletAddress);
      console.log('[Wallet] Nonce received:', nonce);
      
      // Step 2: Sign the message
      console.log('[Wallet] Requesting signature...');
      toast.info('Please sign the message', { description: 'This proves you own the wallet (no gas cost)' });
      const signer = await provider.getSigner();
      console.log('[Wallet] Signer obtained');
      const signature = await signer.signMessage(message);
      console.log('[Wallet] Signature received:', signature.substring(0, 20) + '...');
      
      // Step 3: Login with signature
      console.log('[Wallet] Sending login request...');
      toast.info('Verifying...', { description: 'Completing authentication' });
      await authApi.login(walletAddress, signature, nonce);
      console.log('[Wallet] Login successful');
      
      // Update state
      setAddress(walletAddress);
      setIsConnected(true);
      
      // Check for Genesis NFT
      console.log('[Wallet] Checking Genesis NFT...');
      const hasNFT = await checkGenesisNFT(walletAddress);
      console.log('[Wallet] Genesis NFT check:', hasNFT);
      
      // Set wallet for registry API
      registryClient.setWalletAddress(walletAddress);
      
      toast.success('Wallet connected!', { 
        description: hasNFT ? 'Genesis NFT holder verified' : 'Standard wallet connected' 
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect wallet';
      setError(errorMessage);
      console.error('[Wallet] Connection error:', err);
      toast.error('Connection failed', { description: errorMessage });
      
      // Reset state on error
      setAddress(null);
      setIsConnected(false);
      authApi.logout();
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    setHasGenesisNFT(false);
    setError(null);
    registryClient.setWalletAddress('');
    authApi.logout();
    toast.info('Wallet disconnected');
  };

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== address) {
        // Account changed, require re-authentication
        disconnect();
        toast.info('Account changed', { description: 'Please reconnect with your new account' });
      }
    };

    const handleChainChanged = () => {
      // Reload the page on chain change as recommended by MetaMask
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [address]);

  return {
    address,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    hasGenesisNFT,
    checkGenesisNFT: () => checkGenesisNFT(address || undefined),
  };
}