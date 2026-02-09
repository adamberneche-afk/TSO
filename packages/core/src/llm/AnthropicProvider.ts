import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider } from './BaseProvider';

export class AnthropicProvider implements ILLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-haiku-20240307') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      });
      return true;
    } catch {
      return false;
    }
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
      return text;
    } catch (error) {
      console.error('[AnthropicProvider] Error:', error);
      throw new Error(`Anthropic API Error: ${(error as Error).message}`);
    }
  }
}
