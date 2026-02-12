"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  chainId: number | null;
  balance: string | null;
}

export interface UseWalletReturn extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
}

// Check if MetaMask is installed
const isMetaMaskInstalled = (): boolean => {
  return typeof window !== "undefined" && window.ethereum !== undefined;
};

// Format address for display (0x1234...5678)
const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    chainId: null,
    balance: null,
  });

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!isMetaMaskInstalled()) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();
          const balance = await provider.getBalance(address);

          setState({
            address,
            isConnected: true,
            isConnecting: false,
            error: null,
            chainId: Number(network.chainId),
            balance: ethers.formatEther(balance),
          });
        }
      } catch (err) {
        console.error("Failed to check wallet connection:", err);
      }
    };

    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        setState({
          address: null,
          isConnected: false,
          isConnecting: false,
          error: null,
          chainId: null,
          balance: null,
        });
      } else {
        // Account switched
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const network = await provider.getNetwork();
        const balance = await provider.getBalance(address);

        setState({
          address,
          isConnected: true,
          isConnecting: false,
          error: null,
          chainId: Number(network.chainId),
          balance: ethers.formatEther(balance),
        });
      }
    };

    const handleChainChanged = () => {
      // Reload the page on chain change as recommended by MetaMask
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      setState((prev) => ({
        ...prev,
        error: "MetaMask is not installed. Please install MetaMask to continue.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      await provider.send("eth_requestAccounts", []);
      
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const balance = await provider.getBalance(address);

      setState({
        address,
        isConnected: true,
        isConnecting: false,
        error: null,
        chainId: Number(network.chainId),
        balance: ethers.formatEther(balance),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet";
      
      // Handle user rejection gracefully
      if (errorMessage.includes("user rejected") || errorMessage.includes("User denied")) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: "Connection cancelled by user",
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: errorMessage,
        }));
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      chainId: null,
      balance: null,
    });
  }, []);

  const switchNetwork = useCallback(async (chainId: number) => {
    if (!isMetaMaskInstalled()) {
      setState((prev) => ({
        ...prev,
        error: "MetaMask is not installed",
      }));
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to switch network";
      setState((prev) => ({ ...prev, error: errorMessage }));
    }
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!isMetaMaskInstalled() || !state.isConnected) {
      setState((prev) => ({
        ...prev,
        error: "Wallet not connected",
      }));
      return null;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);
      return signature;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign message";
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.isConnected]);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    signMessage,
  };
}

// Utility function to format address
export { formatAddress };

// Type augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
