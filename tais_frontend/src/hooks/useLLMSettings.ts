import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LLMProvider, ProviderConfig, CostSettings } from '../types/llm';
import { LLM_PROVIDERS, DEFAULT_COST_SETTINGS } from '../types/llm';
import { 
  saveApiKey, 
  getStoredApiKey, 
  hasApiKey, 
  deleteApiKey,
  getDecryptedApiKey,
  clearAllApiKeys
} from '../services/apiKeyManager';
import { ethers } from 'ethers';

interface LLMSettingsState {
  selectedProvider: LLMProvider | null;
  availableProviders: LLMProvider[];
  customBaseUrl: string;
  costSettings: CostSettings;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setProvider: (provider: LLMProvider) => void;
  setCustomBaseUrl: (url: string) => void;
  updateCostSettings: (settings: Partial<CostSettings>) => void;
  saveProviderApiKey: (provider: LLMProvider, apiKey: string, signer: ethers.JsonRpcSigner) => Promise<void>;
  getDecryptedApiKey: (provider: LLMProvider, signer: ethers.JsonRpcSigner) => Promise<string | null>;
  hasApiKey: (provider: LLMProvider) => boolean;
  deleteApiKey: (provider: LLMProvider) => void;
  clearAllKeys: () => void;
  reset: () => void;
}

export const useLLMSettings = create<LLMSettingsState>()(
  persist(
    (set, get) => ({
      selectedProvider: null,
      availableProviders: Object.keys(LLM_PROVIDERS) as LLMProvider[],
      customBaseUrl: '',
      costSettings: DEFAULT_COST_SETTINGS,
      isLoading: false,
      error: null,

      setProvider: (provider: LLMProvider) => {
        set({ selectedProvider: provider, error: null });
      },

      setCustomBaseUrl: (url: string) => {
        set({ customBaseUrl: url });
      },

      updateCostSettings: (settings: Partial<CostSettings>) => {
        set((state) => ({
          costSettings: { ...state.costSettings, ...settings }
        }));
      },

      saveProviderApiKey: async (provider: LLMProvider, apiKey: string, signer: ethers.JsonRpcSigner) => {
        set({ isLoading: true, error: null });
        try {
          const { encryptedData, iv } = await encryptApiKey(apiKey, signer);
          saveApiKey(provider, encryptedData, iv);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to save API key' 
          });
          throw error;
        }
      },

      getDecryptedApiKey: async (provider: LLMProvider, signer: ethers.JsonRpcSigner) => {
        return await getDecryptedApiKey(provider, signer);
      },

      hasApiKey: (provider: LLMProvider) => {
        return hasApiKey(provider);
      },

      deleteApiKey: (provider: LLMProvider) => {
        deleteApiKey(provider);
        if (get().selectedProvider === provider) {
          set({ selectedProvider: null });
        }
      },

      clearAllKeys: () => {
        clearAllApiKeys();
        set({ selectedProvider: null });
      },

      reset: () => {
        set({
          selectedProvider: null,
          customBaseUrl: '',
          costSettings: DEFAULT_COST_SETTINGS,
          isLoading: false,
          error: null
        });
      }
    }),
    {
      name: 'llm-settings',
      partialize: (state) => ({
        selectedProvider: state.selectedProvider,
        customBaseUrl: state.customBaseUrl,
        costSettings: state.costSettings
      })
    }
  )
);

// Import encryptApiKey at the top level to avoid circular dependency
import { encryptApiKey } from '../services/apiKeyManager';
