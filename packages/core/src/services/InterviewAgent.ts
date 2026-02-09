import { ILLMProvider } from '../llm/BaseProvider';
import { AnthropicProvider } from '../llm/AnthropicProvider';
import { LocalProvider } from '../llm/LocalProvider';
import { InterviewConfig, UserProfile } from '@think/types';
import { v4 as uuidv4 } from 'uuid';

const PromptCache = new Map<string, any>();

export class InterviewAgent {
  private provider: ILLMProvider;
  private state: Partial<UserProfile>;

  constructor(config: InterviewConfig, systemApiKey?: string) {
    if (config.providerType === 'local') {
      const url = config.localProviderUrl || 'http://localhost:11434';
      const model = config.localModel || 'llama3:instruct';
      this.provider = new LocalProvider(url, model);
    } else {
      const apiKey = config.anthropicApiKey || systemApiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("No Anthropic API Key provided.");
      const model = config.anthropicModel || 'claude-3-haiku-20240307';
      this.provider = new AnthropicProvider(apiKey, model);
    }
    this.state = this.initialState();
  }

  private initialState(): Partial<UserProfile> {
    return {
      version: "1.0",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      wallet_address: "",
      identity: { primary_activity: 'learning', project_types: [], experience_level: 'beginner' },
      technical: { preferred_chains: [], wallets: [], dev_tools: [] },
      work_patterns: { active_hours: { start: "", end: "", timezone: "" }, work_style: 'flexible', productivity_peak: 'morning' },
      notifications: { enabled: true, urgency_threshold: 'medium', channels: { push: true, email: false, discord: false, telegram: false } },
      finance: { risk_tolerance: 'moderate', portfolio_size_tier: 'medium', investment_horizon: 'long_term' },
      communication: { tone: 'casual', verbosity: 'balanced' },
      preferences: { theme: 'dark', default_currency: 'USD' },
      metadata: { confidence_score: 0, genesis_nft_verified: false, interview_duration_seconds: 0, device_id: '', questions_answered: 0, telemetry_opt_in: false, last_updated_by: 'agent' }
    };
  }

  async askQuestion(questionId: string, context: string): Promise<{ nextQuestion: string, extractedData: any }> {
    const cacheKey = `${questionId}_${context}`;
    if (PromptCache.has(cacheKey)) return PromptCache.get(cacheKey);

    const prompt = `Context: ${context}\nUser Answer: ${questionId}`;
    const systemPrompt = "You are a JSON extraction engine. Return ONLY valid JSON, no markdown, no conversational filler.";

    try {
      const rawResponse = await this.provider.complete(systemPrompt, prompt);
      let cleanResponse = rawResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace('```json', '').replace('```', '').trim();
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace('```', '').replace('```', '').trim();
      }
      const extractedData = JSON.parse(cleanResponse);
      const result = { nextQuestion: "What else?", extractedData };
      PromptCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("LLM Parse Error:", error);
      return { nextQuestion: "What else?", extractedData: {} };
    }
  }

  finalizeProfile(walletAddress: string): UserProfile {
    const duration = 180;
    const deviceId = process.env.DEV_MODE ? 'dev-mode-device-123' : uuidv4();
    const profile = {
      ...this.initialState(),
      ...this.state,
      wallet_address: walletAddress,
      updated_at: new Date().toISOString(),
      metadata: {
        ...this.initialState().metadata,
        device_id: deviceId,
        interview_duration_seconds: duration,
        genesis_nft_verified: true
      }
    };
    return profile as UserProfile;
  }
}
