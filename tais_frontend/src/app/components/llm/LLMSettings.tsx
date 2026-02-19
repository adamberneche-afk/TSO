import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { ExternalLink, Key, DollarSign, AlertCircle, CheckCircle2, Trash2, Cpu, Zap, ShieldCheck } from 'lucide-react';
import { useLLMSettings } from '../../../hooks/useLLMSettings';
import { LLM_PROVIDERS } from '../../../types/llm';
import type { LLMProvider } from '../../../types/llm';
import { toast } from 'sonner';
import { BrowserProvider } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface ProviderSelectorProps {
  onProviderChange?: (provider: LLMProvider) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({ onProviderChange }) => {
  const { selectedProvider, setProvider, hasApiKey } = useLLMSettings();

  const handleProviderChange = (value: string) => {
    const provider = value as LLMProvider;
    setProvider(provider);
    onProviderChange?.(provider);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-[#717171] font-bold">Select AI Provider</label>
        <Select value={selectedProvider || ''} onValueChange={handleProviderChange}>
          <SelectTrigger id="provider" className="w-full bg-[#0A0A0B] border-[#262626] h-12">
            <SelectValue placeholder="CHOOSE A PROVIDER..." />
          </SelectTrigger>
          <SelectContent className="bg-[#141415] border-[#262626]">
            {Object.values(LLM_PROVIDERS).map((provider) => (
              <SelectItem key={provider.id} value={provider.id} className="focus:bg-white/5 focus:text-white">
                <div className="flex items-center justify-between w-full">
                  <span className="uppercase tracking-widest text-xs font-mono">{provider.name}</span>
                  {hasApiKey(provider.id) && (
                    <CheckCircle2 className="w-3 h-3 text-[#4ADE80] ml-2" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProvider && (
        <div className="bg-[#0A0A0B] border border-[#262626] rounded-lg p-4 animate-in fade-in slide-in-from-top-1">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">{LLM_PROVIDERS[selectedProvider].name}</h4>
              <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-[#262626] text-[#3B82F6]">
                ${LLM_PROVIDERS[selectedProvider].costPer1KTokens.input}/1K TOKENS
              </Badge>
            </div>
            <p className="text-xs text-[#A1A1A1] leading-relaxed">
              {LLM_PROVIDERS[selectedProvider].description}
            </p>
            <a
              href={LLM_PROVIDERS[selectedProvider].docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#3B82F6] hover:text-white uppercase tracking-widest font-bold flex items-center gap-1 transition-colors"
            >
              Get API Key <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

interface ApiKeyInputProps {
  provider: LLMProvider;
  onSaved?: () => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ provider, onSaved }) => {
  const [apiKey, setApiKey] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const { saveProviderApiKey, hasApiKey, deleteApiKey, isLoading } = useLLMSettings();
  const hasKey = hasApiKey(provider);

  const getSigner = async () => {
    if (!window.ethereum) {
      throw new Error('No wallet detected');
    }
    const provider = new BrowserProvider(window.ethereum);
    return await provider.getSigner();
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    try {
      const signer = await getSigner();
      await saveProviderApiKey(provider, apiKey.trim(), signer);
      toast.success('API key saved securely');
      setApiKey('');
      onSaved?.();
    } catch (error) {
      toast.error('Please connect your wallet first');
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to remove this API key?')) {
      deleteApiKey(provider);
      toast.success('API key removed');
    }
  };

  if (hasKey) {
    return (
      <div className="flex items-center justify-between p-4 bg-[#4ADE80]/5 border border-[#4ADE80]/20 rounded-lg">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-[#4ADE80]" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#4ADE80]">API KEY ENCRYPTED & STORED</span>
        </div>
        <button 
          onClick={handleDelete}
          className="text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-400 transition-colors"
        >
          REMOVE
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-widest text-[#717171] font-bold flex items-center gap-2">
          <Key className="w-3 h-3" />
          API Key
        </label>
        {provider !== 'local' && (
          <span className="text-[9px] uppercase tracking-widest text-[#717171]">
            Encrypted with wallet signature
          </span>
        )}
      </div>
      
      <div className="flex gap-2">
        <input
          type={isRevealed ? 'text' : 'password'}
          placeholder={provider === 'local' ? 'NO KEY NEEDED FOR LOCAL MODELS' : 'ENTER API KEY...'}
          className="flex-1 bg-[#0A0A0B] border border-[#262626] rounded-md px-4 py-3 text-sm focus:border-[#3B82F6] outline-none font-mono"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={provider === 'local' || isLoading}
        />
        {provider !== 'local' && (
          <button
            type="button"
            onClick={() => setIsRevealed(!isRevealed)}
            className="px-4 border border-[#262626] rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
            disabled={isLoading}
          >
            {isRevealed ? 'HIDE' : 'SHOW'}
          </button>
        )}
      </div>

      {provider !== 'local' && (
        <button 
          onClick={handleSave} 
          disabled={!apiKey.trim() || isLoading}
          className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-md hover:bg-white/90 disabled:opacity-50 transition-all active:scale-95"
        >
          {isLoading ? 'ENCRYPTING...' : 'COMMIT API KEY'}
        </button>
      )}

      <div className="flex items-start gap-3 p-4 bg-[#3B82F6]/5 border border-[#3B82F6]/20 rounded-lg">
        <ShieldCheck className="w-4 h-4 text-[#3B82F6] mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-[#A1A1A1] uppercase tracking-widest leading-relaxed">
          Your API key is encrypted using your wallet signature and stored only in your browser's localStorage. 
          It never leaves your device.
        </p>
      </div>
    </div>
  );
};

interface CostSettingsPanelProps {
  compact?: boolean;
}

export const CostSettingsPanel: React.FC<CostSettingsPanelProps> = ({ compact = false }) => {
  const { costSettings, updateCostSettings } = useLLMSettings();

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-widest text-[#717171] font-bold flex items-center gap-2">
            <DollarSign className="w-3 h-3" />
            Max Budget
          </label>
          <span className="font-mono text-sm text-[#3B82F6]">${costSettings.maxCostPerInterview.toFixed(2)}</span>
        </div>
        <Slider
          value={[costSettings.maxCostPerInterview]}
          onValueChange={([value]) => updateCostSettings({ maxCostPerInterview: value })}
          min={0.10}
          max={5.00}
          step={0.10}
          className="py-4"
        />
      </div>
    );
  }

  return (
    <div className="bg-[#141415] border border-[#262626] rounded-lg overflow-hidden">
      <div className="p-6 border-b border-[#262626] bg-[#141415]/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#3B82F6]" />
            Budget Settings
          </h3>
        </div>
        <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-[#262626]">
          COST PROTECTION
        </Badge>
      </div>
      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-widest text-[#717171] font-bold">Max Cost per Interview</label>
            <span className="font-mono text-lg text-[#3B82F6] font-bold">${costSettings.maxCostPerInterview.toFixed(2)}</span>
          </div>
          <Slider
            value={[costSettings.maxCostPerInterview]}
            onValueChange={([value]) => updateCostSettings({ maxCostPerInterview: value })}
            min={0.10}
            max={5.00}
            step={0.10}
          />
          <p className="text-[10px] text-[#717171] uppercase tracking-widest">
            Automatic shutdown when limit reached.
          </p>
        </div>

        <div className="space-y-4 pt-4 border-t border-[#262626]">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-widest text-[#717171] font-bold">Warning Threshold</label>
            <span className="font-mono text-sm text-white font-bold">{Math.round(costSettings.warningThreshold * 100)}%</span>
          </div>
          <Slider
            value={[costSettings.warningThreshold * 100]}
            onValueChange={([value]) => updateCostSettings({ warningThreshold: value / 100 })}
            min={50}
            max={95}
            step={5}
          />
        </div>
      </div>
    </div>
  );
};

interface LLMSettingsPanelProps {
  onComplete?: () => void;
}

export const LLMSettingsPanel: React.FC<LLMSettingsPanelProps> = ({ onComplete }) => {
  const { selectedProvider } = useLLMSettings();

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-[#141415] border border-[#262626] rounded-lg overflow-hidden">
        <div className="p-6 border-b border-[#262626] bg-[#141415]/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#3B82F6]" />
              AI Provider
            </h3>
          </div>
          <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-[#262626] text-[#3B82F6]">
            V2.2.0
          </Badge>
        </div>
        <div className="p-6 space-y-8">
          <ProviderSelector />
          
          {selectedProvider && (
            <div className="pt-6 border-t border-[#262626]">
              <ApiKeyInput 
                provider={selectedProvider} 
                onSaved={onComplete}
              />
            </div>
          )}
        </div>
      </div>

      <CostSettingsPanel />

      <div className="flex items-start gap-4 p-6 bg-[#0F0F10] border border-[#262626] rounded-lg">
        <div className="w-10 h-10 rounded bg-[#141415] border border-[#262626] flex items-center justify-center flex-shrink-0">
          <Cpu className="w-5 h-5 text-[#3B82F6]" />
        </div>
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-white">Cost Architecture</h4>
          <div className="space-y-2">
            <CostInfoItem text="Direct payment to providers (OpenAI/Anthropic)" />
            <CostInfoItem text="Zero TAIS markup or hidden fees" />
            <CostInfoItem text="Local models (Ollama) are 100% free" />
          </div>
        </div>
      </div>
    </div>
  );
};

function CostInfoItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-1 rounded-full bg-[#3B82F6]" />
      <span className="text-[10px] text-[#A1A1A1] uppercase tracking-widest">{text}</span>
    </div>
  );
}

export default LLMSettingsPanel;
