import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { ExternalLink, Key, DollarSign, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
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
        <Label htmlFor="provider">Select AI Provider</Label>
        <Select value={selectedProvider || ''} onValueChange={handleProviderChange}>
          <SelectTrigger id="provider" className="w-full">
            <SelectValue placeholder="Choose a provider..." />
          </SelectTrigger>
          <SelectContent>
            {Object.values(LLM_PROVIDERS).map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{provider.name}</span>
                  {hasApiKey(provider.id) && (
                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-2" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProvider && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{LLM_PROVIDERS[selectedProvider].name}</h4>
                <Badge variant="outline">
                  ${LLM_PROVIDERS[selectedProvider].costPer1KTokens.input}/1K tokens
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {LLM_PROVIDERS[selectedProvider].description}
              </p>
              <a
                href={LLM_PROVIDERS[selectedProvider].docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>
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
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="text-sm text-green-800">API key saved securely</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600">
          <Trash2 className="w-4 h-4 mr-1" />
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="apiKey" className="flex items-center gap-2">
          <Key className="w-4 h-4" />
          API Key
        </Label>
        {provider !== 'local' && (
          <span className="text-xs text-gray-500">
            Encrypted with your wallet signature
          </span>
        )}
      </div>
      
      <div className="flex gap-2">
        <Input
          id="apiKey"
          type={isRevealed ? 'text' : 'password'}
          placeholder={provider === 'local' ? 'No API key needed for local models' : 'Enter your API key...'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={provider === 'local' || isLoading}
          className="flex-1"
        />
        {provider !== 'local' && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsRevealed(!isRevealed)}
            disabled={isLoading}
          >
            {isRevealed ? 'Hide' : 'Show'}
          </Button>
        )}
      </div>

      {provider !== 'local' && (
        <Button 
          onClick={handleSave} 
          disabled={!apiKey.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? 'Encrypting...' : 'Save API Key Securely'}
        </Button>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-500">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Max Cost per Interview
          </Label>
          <span className="font-medium">${costSettings.maxCostPerInterview.toFixed(2)}</span>
        </div>
        <Slider
          value={[costSettings.maxCostPerInterview]}
          onValueChange={([value]) => updateCostSettings({ maxCostPerInterview: value })}
          min={0.10}
          max={5.00}
          step={0.10}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>$0.10</span>
          <span>$5.00</span>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Budget Settings
        </CardTitle>
        <CardDescription>
          Control your AI inference costs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Maximum Cost per Interview</Label>
            <span className="font-medium text-lg">${costSettings.maxCostPerInterview.toFixed(2)}</span>
          </div>
          <Slider
            value={[costSettings.maxCostPerInterview]}
            onValueChange={([value]) => updateCostSettings({ maxCostPerInterview: value })}
            min={0.10}
            max={5.00}
            step={0.10}
          />
          <p className="text-sm text-gray-600">
            The interview will automatically stop when this limit is reached.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Warning Threshold</Label>
            <span className="font-medium">{Math.round(costSettings.warningThreshold * 100)}%</span>
          </div>
          <Slider
            value={[costSettings.warningThreshold * 100]}
            onValueChange={([value]) => updateCostSettings({ warningThreshold: value / 100 })}
            min={50}
            max={95}
            step={5}
          />
          <p className="text-sm text-gray-600">
            Show warning when budget usage reaches this percentage.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

interface LLMSettingsPanelProps {
  onComplete?: () => void;
}

export const LLMSettingsPanel: React.FC<LLMSettingsPanelProps> = ({ onComplete }) => {
  const { selectedProvider } = useLLMSettings();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>AI Provider Settings</CardTitle>
          <CardDescription>
            Configure your AI provider and budget for dynamic question generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProviderSelector />
          
          {selectedProvider && (
            <ApiKeyInput 
              provider={selectedProvider} 
              onSaved={onComplete}
            />
          )}
        </CardContent>
      </Card>

      <CostSettingsPanel />

      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">How costs work:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>You pay directly to the AI provider (OpenAI, Anthropic, etc.)</li>
            <li>We don't charge any markup or fees</li>
            <li>Local models (Ollama) are completely free</li>
            <li>The interview stops automatically when your budget is reached</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LLMSettingsPanel;
