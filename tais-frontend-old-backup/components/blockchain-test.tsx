"use client";

/**
 * Live Blockchain Test Component
 * Run this on the frontend to test MetaMask + mainnet integration
 * 
 * Add this to any page temporarily:
 * import { BlockchainTest } from '@/components/blockchain-test';
 * <BlockchainTest />
 */

import { useState } from 'react';
import { useWallet } from '@/hooks/use-wallet';

export function BlockchainTest() {
  const { address, isConnected, connect, disconnect, error } = useWallet();
  const [testResults, setTestResults] = useState<{
    network?: string;
    genesisBalance?: string;
    isPublisher?: boolean;
    error?: string;
  }>({});
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    if (!address || !window.ethereum) return;
    
    setTesting(true);
    setTestResults({});

    try {
      // Check network
      const provider = window.ethereum;
      const chainId = await provider.request({ method: 'eth_chainId' }) as string;
      const networkNames: Record<string, string> = {
        '0x1': 'Ethereum Mainnet',
        '0xaa36a7': 'Sepolia Testnet',
        '0x5': 'Goerli Testnet',
      };

      setTestResults(prev => ({
        ...prev,
        network: networkNames[chainId] || `Chain ID: ${chainId}`,
      }));

      // Check Genesis NFT
      const genesisContract = '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';
      const abi = ['function balanceOf(address owner) view returns (uint256)'];
      
      // Use ethers via CDN or import
      const { ethers } = await import('ethers');
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(genesisContract, abi, browserProvider);
      
      const balance = await contract.balanceOf(address);
      
      setTestResults(prev => ({
        ...prev,
        genesisBalance: balance.toString(),
        isPublisher: balance > 0,
      }));

    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg border border-gray-700 max-w-md">
      <h2 className="text-xl font-bold mb-4 text-white">🔍 Blockchain Test</h2>
      
      {!isConnected ? (
        <button
          onClick={connect}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Connect MetaMask
        </button>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-gray-800 rounded">
            <p className="text-sm text-gray-400">Connected Wallet</p>
            <p className="text-white font-mono text-sm break-all">{address}</p>
          </div>

          <button
            onClick={runTests}
            disabled={testing}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg"
          >
            {testing ? 'Testing...' : 'Run Blockchain Tests'}
          </button>

          {testResults.network && (
            <div className="p-3 bg-gray-800 rounded space-y-2">
              <p className="text-sm text-gray-400">Network</p>
              <p className={`font-medium ${testResults.network.includes('Mainnet') ? 'text-green-400' : 'text-yellow-400'}`}>
                {testResults.network}
              </p>
              
              {testResults.genesisBalance !== undefined && (
                <>
                  <p className="text-sm text-gray-400 mt-2">Genesis NFT Balance</p>
                  <p className="text-white font-medium">{testResults.genesisBalance} NFT(s)</p>
                  
                  <p className="text-sm text-gray-400 mt-2">Publisher Status</p>
                  <p className={`font-medium ${testResults.isPublisher ? 'text-green-400' : 'text-red-400'}`}>
                    {testResults.isPublisher ? '✅ Can Publish' : '❌ Cannot Publish'}
                  </p>
                </>
              )}
              
              {testResults.error && (
                <p className="text-red-400 text-sm mt-2">Error: {testResults.error}</p>
              )}
            </div>
          )}

          <button
            onClick={disconnect}
            className="w-full px-4 py-2 border border-gray-600 hover:bg-gray-800 text-gray-300 rounded-lg text-sm"
          >
            Disconnect
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
