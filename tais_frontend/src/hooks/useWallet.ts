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

      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        const walletAddress = accounts[0];
        
        // Step 1: Get nonce from backend
        toast.info('Authenticating...', { description: 'Getting authentication nonce' });
        const { nonce, message } = await authApi.getNonce(walletAddress);
        
        // Step 2: Sign the message
        toast.info('Please sign the message', { description: 'This proves you own the wallet' });
        const signer = await provider.getSigner();
        const signature = await signer.signMessage(message);
        
        // Step 3: Login with signature
        toast.info('Verifying...', { description: 'Completing authentication' });
        await authApi.login(walletAddress, signature, nonce);
        
        // Update state
        setAddress(walletAddress);
        setIsConnected(true);
        
        // Check for Genesis NFT
        await checkGenesisNFT(walletAddress);
        
        // Set wallet for registry API
        registryClient.setWalletAddress(walletAddress);
        
        toast.success('Wallet connected!', { 
          description: hasGenesisNFT ? 'Genesis NFT holder verified' : 'Standard wallet connected' 
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Wallet connection error:', err);
      toast.error('Connection failed', { description: errorMessage });
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
      } else {
        const newAddress = accounts[0];
        setAddress(newAddress);
        checkGenesisNFT(newAddress);
        registryClient.setWalletAddress(newAddress);
      }
    };

    const handleChainChanged = () => {
      // Reload the page on chain change as recommended by MetaMask
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Check if already connected
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        checkGenesisNFT(accounts[0]);
        registryClient.setWalletAddress(accounts[0]);
      }
    });

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

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