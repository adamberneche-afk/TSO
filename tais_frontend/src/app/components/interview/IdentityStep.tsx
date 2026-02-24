// TAIS Platform - Step 5: Identity & Naming

import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Wallet, Check, AlertCircle } from 'lucide-react';
import { useWallet } from '../../../hooks/useWallet';
import { validateAgentName } from '../../../lib/interview-config';

interface IdentityStepProps {
  name: string;
  walletAddress?: string;
  onNameChange: (name: string) => void;
  onWalletConnect: (address: string) => void;
}

export function IdentityStep({
  name,
  walletAddress,
  onNameChange,
  onWalletConnect,
}: IdentityStepProps) {
  const wallet = useWallet();
  const [nameError, setNameError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    onNameChange(value);
    const validation = validateAgentName(value);
    setNameError(validation.valid ? null : validation.error || null);
  };

  const handleWalletConnect = async () => {
    try {
      console.log('[IdentityStep] Starting wallet connection...');
      
      // Single direct auth flow: connect → nonce → sign → login
      await wallet.connect();
      
      if (wallet.address) {
        onWalletConnect(wallet.address);
      }
    } catch (err: any) {
      console.error('[IdentityStep] Wallet connection failed:', err);
      // Error is already shown via toast in useWallet hook
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-white">Identity & Ownership</h2>
        <p className="text-[#888888]">
          Give your agent a name and optionally claim ownership via blockchain
        </p>
      </div>

      {/* Agent Name */}
      <div className="space-y-4 bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <div className="space-y-2">
          <Label htmlFor="agent-name" className="text-base text-white">
            Agent Name
          </Label>
          <p className="text-sm text-[#888888]">
            Choose a unique name for your agent (alphanumeric, hyphens, and underscores only)
          </p>
        </div>

        <div className="space-y-2">
          <Input
            id="agent-name"
            placeholder="e.g., DataAnalyzer, CalendarAssistant, CreativeHelper"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className={`bg-[#111111] border-[#333333] text-white placeholder:text-[#555555] ${
              nameError ? 'border-[#EF4444]' : name && !nameError ? 'border-[#10B981]' : ''
            }`}
          />
          {nameError && (
            <div className="flex items-center gap-2 text-sm text-[#EF4444]">
              <AlertCircle className="w-4 h-4" />
              {nameError}
            </div>
          )}
          {name && !nameError && (
            <div className="flex items-center gap-2 text-sm text-[#10B981]">
              <Check className="w-4 h-4" />
              Name is valid
            </div>
          )}
        </div>

        <div className="bg-[#111111] border border-[#333333] rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-2">Naming Guidelines</h4>
          <ul className="text-sm text-[#888888] space-y-1">
            <li>• 1-50 characters</li>
            <li>• Letters, numbers, hyphens (-), and underscores (_) only</li>
            <li>• No spaces or special characters</li>
            <li>• Make it descriptive and memorable</li>
          </ul>
        </div>
      </div>

      {/* Wallet Connection */}
      <div className="space-y-4 bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#3B82F6]" />
          <Label className="text-base text-white">Blockchain Ownership (Optional)</Label>
        </div>
        <p className="text-sm text-[#888888]">
          Connect your wallet to own this agent as an NFT and access advanced features
        </p>

        {!wallet.isConnected ? (
          <div className="space-y-4">
            <Button
              onClick={handleWalletConnect}
              disabled={wallet.isConnecting}
              className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white"
            >
              {wallet.isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect MetaMask
                </>
              )}
            </Button>

            {wallet.error && (
              <div className="text-sm text-[#EF4444] bg-[rgba(239,68,68,0.1)] border border-[#EF4444] rounded p-3">
                {wallet.error}
              </div>
            )}

            <div className="bg-[#111111] border border-[#333333] rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Benefits of connecting:</h4>
              <ul className="text-sm text-[#888888] space-y-1">
                <li>• Prove ownership of your agent configuration</li>
                <li>• Access premium skills and features</li>
                <li>• Publish agents to the marketplace</li>
                <li>• Transfer or sell your agent</li>
              </ul>
            </div>
          </div>
        ) : (
          <Card className="bg-[#111111] border-[#10B981]">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Wallet Connected</p>
                    <p className="text-xs text-[#888888] font-mono">
                      {wallet?.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Connected'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={wallet.disconnect}
                  variant="ghost"
                  size="sm"
                  className="text-[#888888] hover:text-white"
                >
                  Disconnect
                </Button>
              </div>

              {wallet.hasGenesisNFT && (
                <div className="bg-[rgba(59,130,246,0.1)] border border-[#3B82F6] rounded p-3">
                  <p className="text-sm text-[#3B82F6] font-medium">
                    🎉 Genesis NFT Holder - You have access to all premium features!
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
