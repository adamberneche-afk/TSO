export interface ILLMProvider {
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
  healthCheck(): Promise<boolean>;
}
