export type LLMProvider = 'openai' | 'anthropic' | 'local' | 'custom';

export interface ProviderConfig {
  name: string;
  id: LLMProvider;
  models: string[];
  defaultModel: string;
  costPer1KTokens: {
    input: number;
    output: number;
  };
  baseUrl?: string;
  description: string;
  docsUrl: string;
}

export const LLM_PROVIDERS: Record<LLMProvider, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    id: 'openai',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-3.5-turbo',
    costPer1KTokens: {
      input: 0.0015,
      output: 0.002
    },
    description: 'GPT-4 and GPT-3.5 models with best-in-class performance',
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  anthropic: {
    name: 'Anthropic',
    id: 'anthropic',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    defaultModel: 'claude-3-sonnet',
    costPer1KTokens: {
      input: 0.003,
      output: 0.015
    },
    description: 'Claude 3 models with strong reasoning capabilities',
    docsUrl: 'https://console.anthropic.com/settings/keys'
  },
  local: {
    name: 'Local (Ollama)',
    id: 'local',
    models: ['llama2', 'mistral', 'codellama', 'custom'],
    defaultModel: 'llama2',
    costPer1KTokens: {
      input: 0,
      output: 0
    },
    baseUrl: 'http://localhost:11434',
    description: 'Run models locally with Ollama - no API key needed',
    docsUrl: 'https://ollama.com'
  },
  custom: {
    name: 'Custom API',
    id: 'custom',
    models: ['custom'],
    defaultModel: 'custom',
    costPer1KTokens: {
      input: 0,
      output: 0
    },
    baseUrl: '',
    description: 'Connect to any OpenAI-compatible API endpoint',
    docsUrl: ''
  }
};

export interface LLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  model: string;
}

export interface CostSettings {
  maxCostPerInterview: number;
  warningThreshold: number; // 0.0 - 1.0
  currency: string;
}

export const DEFAULT_COST_SETTINGS: CostSettings = {
  maxCostPerInterview: 0.50, // $0.50 default
  warningThreshold: 0.8, // Warn at 80%
  currency: 'USD'
};
