// This package's "test" script (`jest`) had never actually run: there
// were zero test files, so `npm test` failed outright with "No tests
// found, exiting with code 1" the moment anything tried to invoke it
// (see docs/DOCS_VS_CODEBASE.md's build-all-packages.yml wiring).
// These are minimal, real tests of SlackIntegration's own deterministic
// logic -- not full behavioral coverage of every method -- with the
// Slack/Linear SDK clients mocked so nothing here makes a real network
// call.

import { SlackIntegration } from '../index';

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    conversations: { replies: jest.fn() },
    chat: { postMessage: jest.fn() },
    users: { info: jest.fn() },
  })),
}));

jest.mock('@slack/oauth', () => ({
  InstallProvider: jest.fn().mockImplementation(() => ({
    generateInstallUrl: jest.fn(),
    handleCallback: jest.fn(),
  })),
}));

function makeFakeAgent(chatResponse?: string) {
  return {
    getContext: jest.fn().mockResolvedValue({ config: { profile: null, soul: null } }),
    chat: jest.fn().mockResolvedValue({ message: chatResponse }),
    updateMemory: jest.fn().mockResolvedValue({ success: true, entry: {} }),
  } as any;
}

function makeIntegration(agent: any) {
  return new SlackIntegration({
    agent,
    slackToken: 'fake-token',
    signingSecret: 'fake-secret',
    clientId: 'fake-client-id',
    clientSecret: 'fake-client-secret',
  });
}

describe('SlackIntegration.analyzeTone', () => {
  it('parses a well-formed JSON tone analysis from the agent', async () => {
    const agent = makeFakeAgent(
      JSON.stringify({ sentiment: 'negative', suggestedTone: 'empathetic', urgency: 'high' })
    );
    const integration = makeIntegration(agent);

    const result = await integration.analyzeTone('This is broken and I need help now.');

    expect(result).toEqual({ sentiment: 'negative', suggestedTone: 'empathetic', urgency: 'high' });
  });

  it('falls back to a neutral/low default when the agent response is not valid JSON', async () => {
    const agent = makeFakeAgent('not json at all');
    const integration = makeIntegration(agent);

    const result = await integration.analyzeTone('hello');

    expect(result).toEqual({ sentiment: 'neutral', suggestedTone: 'professional', urgency: 'low' });
  });
});

describe('SlackIntegration.getThreadContext', () => {
  it('maps raw Slack messages to the simplified {user, text, ts} shape', async () => {
    const agent = makeFakeAgent();
    const integration = makeIntegration(agent);
    const slackClient = (integration as any).slack;
    slackClient.conversations.replies.mockResolvedValue({
      messages: [
        { user: 'U1', text: 'first', ts: '1.000' },
        { user: 'U2', text: 'second', ts: '2.000' },
      ],
    });

    const result = await integration.getThreadContext({ channelId: 'C1', threadTs: '1.000' });

    expect(result).toEqual([
      { user: 'U1', text: 'first', ts: '1.000' },
      { user: 'U2', text: 'second', ts: '2.000' },
    ]);
    expect(slackClient.conversations.replies).toHaveBeenCalledWith({
      channel: 'C1',
      ts: '1.000',
      limit: 10,
    });
  });

  it('returns an empty array when Slack reports no messages', async () => {
    const agent = makeFakeAgent();
    const integration = makeIntegration(agent);
    (integration as any).slack.conversations.replies.mockResolvedValue({});

    const result = await integration.getThreadContext({ channelId: 'C1', threadTs: '1.000' });

    expect(result).toEqual([]);
  });
});
