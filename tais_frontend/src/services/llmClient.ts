import type { 
  LLMProvider, 
  ProviderConfig, 
  LLMRequest, 
  LLMResponse,
  LLM_PROVIDERS 
} from '../types/llm';
import { LLM_PROVIDERS as PROVIDERS } from '../types/llm';

export class LLMClient {
  private provider: LLMProvider;
  private apiKey: string;
  private config: ProviderConfig;
  private baseUrl: string;

  constructor(provider: LLMProvider, apiKey: string, customBaseUrl?: string) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.config = PROVIDERS[provider];
    
    // Set base URL
    if (provider === 'custom' && customBaseUrl) {
      this.baseUrl = customBaseUrl.replace(/\/$/, ''); // Remove trailing slash
    } else if (this.config.baseUrl) {
      this.baseUrl = this.config.baseUrl;
    } else {
      // Default URLs for known providers
      this.baseUrl = provider === 'openai' 
        ? 'https://api.openai.com/v1'
        : provider === 'anthropic'
        ? 'https://api.anthropic.com/v1'
        : '';
    }
  }

  /**
   * Send completion request to LLM
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    switch (this.provider) {
      case 'openai':
        return this.callOpenAI(request);
      case 'anthropic':
        return this.callAnthropic(request);
      case 'gemini':
        return this.callGemini(request);
      case 'local':
        return this.callLocal(request);
      case 'custom':
        return this.callCustom(request);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Calculate cost based on token usage
   */
  calculateCost(promptTokens: number, completionTokens: number): number {
    const inputCost = (promptTokens / 1000) * this.config.costPer1KTokens.input;
    const outputCost = (completionTokens / 1000) * this.config.costPer1KTokens.output;
    return inputCost + outputCost;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.defaultModel;
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      cost: this.calculateCost(
        data.usage?.prompt_tokens || 0,
        data.usage?.completion_tokens || 0
      ),
      model: data.model
    };
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.defaultModel;
    
    // Convert messages to Anthropic format
    let systemMessage = '';
    const messages = request.messages.map(msg => {
      if (msg.role === 'system') {
        systemMessage = msg.content;
        return null;
      }
      return {
        role: msg.role,
        content: msg.content
      };
    }).filter(Boolean);

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        messages,
        system: systemMessage || undefined,
        max_tokens: request.maxTokens ?? 1000,
        temperature: request.temperature ?? 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    
    return {
      content: data.content?.[0]?.text || '',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      },
      cost: this.calculateCost(
        data.usage?.input_tokens || 0,
        data.usage?.output_tokens || 0
      ),
      model: data.model
    };
  }

  /**
   * Call Google Gemini API
   */
  private async callGemini(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.defaultModel;
    
    // Convert messages to Gemini format - v1 API uses contents and systemInstruction
    const contents = request.messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
    
    // Extract system instruction  
    const systemMessage = request.messages.find(msg => msg.role === 'system');
    
    const body: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 1000
      }
    };
    
    // For v1 API, prepend system message to contents as first user message
    // (v1 doesn't support system_instruction field)
    if (systemMessage) {
      contents.unshift({
        role: 'user',
        parts: [{ text: systemMessage.content }]
      });
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
    
    return {
      content: text,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens
      },
      cost: this.calculateCost(inputTokens, outputTokens),
      model: model
    };
  }

  /**
   * Call local Ollama instance
   */
  private async callLocal(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.defaultModel;
    
    // Combine messages into a single prompt for local models
    const prompt = request.messages.map(msg => {
      if (msg.role === 'system') return `System: ${msg.content}`;
      if (msg.role === 'user') return `User: ${msg.content}`;
      return `Assistant: ${msg.content}`;
    }).join('\n\n');

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error('Local LLM error - Is Ollama running?');
    }

    const data = await response.json();
    
    // Estimate tokens (local models don't provide token counts)
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = Math.ceil(data.response?.length / 4);
    
    return {
      content: data.response || '',
      usage: {
        promptTokens: estimatedInputTokens,
        completionTokens: estimatedOutputTokens,
        totalTokens: estimatedInputTokens + estimatedOutputTokens
      },
      cost: 0, // Local models are free
      model: model
    };
  }

  /**
   * Call custom OpenAI-compatible API
   */
  private async callCustom(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || 'default',
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Custom API error');
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      cost: 0, // Custom APIs - user manages cost
      model: data.model
    };
  }
}

/**
 * Generate dynamic question based on previous responses
 */
export async function generateDynamicQuestion(
  client: LLMClient,
  previousResponses: string[],
  currentQuestionIndex: number
): Promise<string> {
  const systemPrompt = `You are an AI interviewer helping create a skill profile. 
Based on the user's previous responses, generate a contextual follow-up question.
Keep questions concise (1-2 sentences) and focused on extracting specific skills, technologies, or experiences.`;

  let messages: LLMRequest['messages'] = [
    { role: 'system', content: systemPrompt }
  ];

  if (previousResponses.length === 0) {
    // First question - ask about their background
    messages.push({ role: 'user', content: 'The user is starting an interview. Ask them about their professional background and experience.' });
  } else {
    // Add previous responses
    messages.push(...previousResponses.map((response, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: response
    })));
  }

  const response = await client.complete({
    messages,
    maxTokens: 150,
    temperature: 0.8
  });

  return response.content.trim();
}

/**
 * Extract entities using LLM
 */
export async function extractEntitiesWithLLM(
  client: LLMClient,
  text: string
): Promise<Array<{ type: string; value: string; confidence: number }>> {
  const systemPrompt = `Extract entities from the user's response. 
Return a JSON array with objects containing: type (skill, technology, role, company, experience), value (the extracted text), and confidence (0-1).
Example: [{"type": "technology", "value": "React", "confidence": 0.95}]`;

  const response = await client.complete({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    maxTokens: 500,
    temperature: 0.3
  });

  try {
    return JSON.parse(response.content);
  } catch {
    return [];
  }
}
