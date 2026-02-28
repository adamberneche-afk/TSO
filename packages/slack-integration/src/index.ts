/**
 * TAIS Slack Integration
 * 
 * This example demonstrates how to integrate TAIS agents with Slack
 * for AI-powered smart replies and contextual responses.
 * 
 * Features:
 * - Smart reply suggestions
 * - Thread context retrieval
 * - Channel-aware responses
 * - Automatic thread continuation
 */

import { TAISAgent } from 'tais-agent-sdk';
import { WebClient } from '@slack/web-api';
import { InstallProvider } from '@slack/oauth';

export interface SlackIntegrationConfig {
  agent: TAISAgent;
  slackToken: string;
  signingSecret: string;
  clientId: string;
  clientSecret: string;
}

export interface SmartReplyOptions {
  channelId: string;
  threadTs?: string;
  message: string;
  includeContext?: boolean;
}

export interface ThreadContextOptions {
  channelId: string;
  threadTs: string;
  limit?: number;
}

export class SlackIntegration {
  private agent: TAISAgent;
  private slack: WebClient;
  private installer: InstallProvider;
  private clientId: string;
  private clientSecret: string;

  constructor(config: SlackIntegrationConfig) {
    this.agent = config.agent;
    this.slack = new WebClient(config.slackToken);
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    
    this.installer = new InstallProvider({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      stateSecret: config.signingSecret
    });
  }

  /**
   * Generate a smart reply based on conversation context
   */
  async generateSmartReply(options: SmartReplyOptions): Promise<{
    reply: string;
    confidence: number;
    suggested: boolean;
  }> {
    const context = await this.agent.getContext();
    
    let prompt = `Generate a helpful, concise reply to this message:\n\n"${options.message}"`;

    if (options.threadTs) {
      const thread = await this.getThreadContext({
        channelId: options.channelId,
        threadTs: options.threadTs,
        limit: 5
      });
      
      prompt += `\n\nThread context:\n${thread.map(m => `${m.user}: ${m.text}`).join('\n')}`;
    }

    if (options.includeContext !== false) {
      prompt += `\n\nUser profile: ${context.config.profile}`;
      prompt += `\nAgent personality: ${context.config.soul?.substring(0, 500)}`;
    }

    const response = await this.agent.chat({
      context,
      messages: [{ role: 'user', content: prompt }]
    });

    const reply = response.message || 'Thanks for your message!';

    await this.agent.updateMemory({
      context,
      update: {
        type: 'conversation',
        summary: `Replied in Slack channel ${options.channelId}`,
        details: { channelId: options.channelId, replyLength: reply.length }
      }
    });

    return {
      reply,
      confidence: 0.85,
      suggested: true
    };
  }

  /**
   * Get conversation history from a thread
   */
  async getThreadContext(options: ThreadContextOptions): Promise<{
    user: string;
    text: string;
    ts: string;
  }[]> {
    const result = await this.slack.conversations.replies({
      channel: options.channelId,
      ts: options.threadTs,
      limit: options.limit || 10
    });

    return result.messages?.map((msg: any) => ({
      user: msg.user,
      text: msg.text,
      ts: msg.ts
    })) || [];
  }

  /**
   * Post an interactive message with action buttons
   */
  async postInteractiveMessage(channelId: string, text: string, actions: any[]): Promise<string> {
    const result = await this.slack.chat.postMessage({
      channel: channelId,
      text,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text }
        },
        {
          type: 'actions',
          elements: actions.map(action => ({
            type: 'button',
            text: { type: 'plain_text', text: action.text },
            action_id: action.actionId,
            value: action.value
          }))
        }
      ]
    });

    return result.ts || '';
  }

  /**
   * Continue a conversation from another app (session handoff)
   */
  async continueFromParentSession(
    parentSessionId: string,
    newMessage: string,
    channelId: string
  ): Promise<{ reply: string; sessionId: string }> {
    const context = await this.agent.getContext();

    const response = await this.agent.chat({
      context,
      messages: [{ role: 'user', content: newMessage }],
      appContext: { channelId },
      parentSession: parentSessionId
    });

    return {
      reply: response.message || 'Processing your request...',
      sessionId: response.sessionId
    };
  }

  /**
   * Handle slash command from Slack
   */
  async handleSlashCommand(
    command: string,
    userId: string,
    channelId: string
  ): Promise<string> {
    const context = await this.agent.getContext();

    const userInfo = await this.slack.users.info({ user: userId });
    const userName = (userInfo.user as any)?.real_name || 'User';

    const response = await this.agent.chat({
      context,
      messages: [{
        role: 'user',
        content: `/tais ${command} (from ${userName} in channel ${channelId})`
      }],
      appContext: { channelId, userId }
    });

    return response.message || 'Processing your request...';
  }

  /**
   * Get OAuth installation URL
   */
  async getInstallUrl(): Promise<string> {
    return this.installer.generateInstallUrl({
      scopes: [
        'chat:write',
        'channels:read',
        'channels:history',
        'groups:history',
        'users:read',
        'commands'
      ]
    });
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code: string): Promise<{
    accessToken: string;
    teamId: string;
  }> {
    const result = await (this.installer.handleCallback as any)({
      body: { code },
      redirectUrl: process.env.SLACK_REDIRECT_URI
    });

    return {
      accessToken: (result as any).accessToken,
      teamId: (result as any).team?.id || ''
    };
  }

  /**
   * Analyze sentiment and suggest response tone
   */
  async analyzeTone(message: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    suggestedTone: string;
    urgency: 'low' | 'medium' | 'high';
  }> {
    const context = await this.agent.getContext();

    const response = await this.agent.chat({
      context,
      messages: [{
        role: 'user',
        content: `Analyze the sentiment and urgency of this message. Respond with JSON: {"sentiment": "positive/neutral/negative", "suggestedTone": "...", "urgency": "low/medium/high"}\n\nMessage: "${message}"`
      }]
    });

    try {
      const parsed = JSON.parse(response.message || '{}');
      return {
        sentiment: parsed.sentiment || 'neutral',
        suggestedTone: parsed.suggestedTone || 'professional',
        urgency: parsed.urgency || 'low'
      };
    } catch {
      return {
        sentiment: 'neutral',
        suggestedTone: 'professional',
        urgency: 'low'
      };
    }
  }
}

/**
 * Quick start example
 */
export async function example() {
  const agent = new TAISAgent({
    appId: process.env.TAIS_APP_ID!,
    appSecret: process.env.TAIS_APP_SECRET!,
    appName: 'Slack Bot',
    redirectUri: 'http://localhost:3000/slack/callback'
  });

  const slack = new SlackIntegration({
    agent,
    slackToken: process.env.SLACK_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!
  });

  // Generate smart reply
  const reply = await slack.generateSmartReply({
    channelId: 'C123456',
    message: 'Hey, can you help me debug this issue?'
  });

  console.log('Suggested reply:', reply.reply);

  // Get install URL for workspace admins
  const installUrl = slack.getInstallUrl();
  console.log('Install URL:', installUrl);
}
