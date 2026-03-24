import { ILLMProvider } from '../llm/BaseProvider';
import { AnthropicProvider } from '../llm/AnthropicProvider';
import { LocalProvider } from '../llm/LocalProvider';
import { InterviewConfig, UserProfile } from '@think/types';
import { v4 as uuidv4 } from 'uuid';

const PromptCache = new Map<string, any>();

export class InterviewAgent {
  private provider: ILLMProvider;
  private state: UserProfile; // Changed from Partial<UserProfile> to UserProfile
  private config: InterviewConfig;

  /**
   * Set the internal state (used for cloning agents).
   * @param state The new state to apply
   */
  public setState(state: UserProfile): void {
    this.state = state;
  }

  /**
   * Get a copy of the current state.
   */
  public getState(): UserProfile {
    return { ...this.state };
  }

  /**
   * Get the agent's configuration.
   */
  public getConfig(): InterviewConfig {
    return { ...this.config };
  }

  /**
   * Update the agent's configuration partially.
   * @param partialConfig Partial configuration to merge
   */
  public updateConfig(partialConfig: Partial<InterviewConfig>): void {
    // Merge config
    this.config = { ...this.config, ...partialConfig };

    // If provider-related fields changed, we may need to recreate the provider
    const providerChanged = partialConfig.providerType !== undefined ||
      partialConfig.anthropicApiKey !== undefined ||
      (this.config.providerType !== 'local' && partialConfig.localProviderUrl !== undefined) ||
      (this.config.providerType === 'local' && partialConfig.localModel !== undefined) ||
      (this.config.providerType !== 'local' && partialConfig.anthropicModel !== undefined);

    if (providerChanged) {
      // Recreate provider based on updated config
      if (this.config.providerType === 'local') {
        const url = this.config.localProviderUrl || 'http://localhost:11434';
        const model = this.config.localModel || 'llama3:instruct';
        this.provider = new LocalProvider(url, model);
      } else {
        const apiKey = this.config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error("No Anthropic API Key provided.");
        const model = this.config.anthropicModel || 'claude-3-haiku-20240307';
        this.provider = new AnthropicProvider(apiKey, model);
      }
    }
  }

  /**
   * Update the agent's state partially (used for values).
   * @param partialState Partial state to merge
   */
  public updateState(partialState: Partial<UserProfile>): void {
    // Deep merge state (simple shallow merge for now; can be enhanced)
    this.state = { ...this.state, ...partialState };
  }

  constructor(config: InterviewConfig, systemApiKey?: string) {
    this.config = config;
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

  private initialState(): UserProfile {
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

  async askQuestion(questionId: string, context: string, userAnswer: string): Promise<{ nextQuestion: string, extractedData: any }> {
    const cacheKey = `${questionId}_${context}`;
    if (PromptCache.has(cacheKey)) return PromptCache.get(cacheKey);

    const prompt = `Context: ${context}\nUser Answer: ${userAnswer}`;
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

      // Validate that extractedData is an object
      if (typeof extractedData !== 'object' || extractedData === null) {
        throw new Error('LLM response must be a JSON object');
      }

      // Update state with extracted data (excluding metadata which we handle specially)
      const { metadata, ...rest } = extractedData;
      this.state = {
        ...this.state,
        ...rest
      };

      // Update metadata
      this.state.metadata = {
        ...this.state.metadata,
        ...metadata,
        questions_answered: (this.state.metadata.questions_answered + 1),
        last_updated_by: 'agent'
      };

      const result = { nextQuestion: "What else?", extractedData };
      PromptCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("LLM Parse Error:", error);
      return { nextQuestion: "What else?", extractedData: {} };
    }
  }

  finalizeProfile(walletAddress: string): UserProfile {
    const now = new Date();
    const deviceId = process.env.DEV_MODE ? 'dev-mode-device-123' : uuidv4();

    const profile: UserProfile = {
      ...this.state,
      wallet_address: walletAddress,
      updated_at: now.toISOString(),
      metadata: {
        ...this.state.metadata,
        device_id: deviceId,
        interview_duration_seconds: Math.floor((now.getTime() - new Date(this.state.created_at).getTime()) / 1000),
        genesis_nft_verified: true // Set to true when finalizing
      }
    };

    return profile;
  }
}