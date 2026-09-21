// Same gap as packages/slack-integration: this package's "test" script
// (`jest`) had zero test files, so `npm test` failed outright with "No
// tests found, exiting with code 1". These are minimal, real tests of
// LinearIntegration's own deterministic logic (task-line parsing,
// priority mapping) with the Linear SDK client mocked so nothing here
// makes a real network call.

import { LinearIntegration } from '../index';

jest.mock('@linear/sdk', () => ({
  LinearClient: jest.fn().mockImplementation(() => ({})),
}));

function makeFakeAgent(chatResponse?: string) {
  return {
    getContext: jest.fn().mockResolvedValue({ walletAddress: '0xabc' }),
    chat: jest.fn().mockResolvedValue({ message: chatResponse }),
    updateMemory: jest.fn().mockResolvedValue({ success: true, entry: {} }),
  } as any;
}

function makeIntegration(agent: any) {
  return new LinearIntegration({ agent, apiKey: 'fake-key', teamId: 'team-1' });
}

describe('LinearIntegration.generateTasks', () => {
  it('parses "title - description (priority: N)" lines out of the agent response', async () => {
    const agent = makeFakeAgent(
      [
        'Fix login bug - Users cannot authenticate with OAuth (priority: 1)',
        'Add password reset flow - Self-service reset via email (priority: 2)',
      ].join('\n')
    );
    const integration = makeIntegration(agent);

    const { tasks } = await integration.generateTasks({
      topic: 'Auth',
      requirements: 'OAuth, password reset',
      count: 2,
    });

    expect(tasks).toEqual([
      { title: 'Fix login bug', description: 'Users cannot authenticate with OAuth', priority: 1 },
      { title: 'Add password reset flow', description: 'Self-service reset via email', priority: 2 },
    ]);
  });

  it('returns no tasks when the agent response has no matching lines', async () => {
    const agent = makeFakeAgent('Sorry, I cannot help with that.');
    const integration = makeIntegration(agent);

    const { tasks } = await integration.generateTasks({ topic: 'x', requirements: 'y' });

    expect(tasks).toEqual([]);
  });
});

describe('LinearIntegration.createTask', () => {
  it('maps a 1-4 priority number to the real Linear SDK priority label and returns the created issue', async () => {
    const agent = makeFakeAgent();
    const integration = makeIntegration(agent);
    const linearClient = (integration as any).linear;
    linearClient.createIssue = jest.fn().mockResolvedValue({
      issue: { id: 'issue-uuid-1', identifier: 'ENG-42' },
    });

    const result = await integration.createTask({
      title: 'Fix login bug',
      description: 'Users cannot authenticate',
      priority: 1,
    });

    expect(result).toEqual({
      issueId: 'issue-uuid-1',
      issueIdentifier: 'ENG-42',
      url: 'https://linear.app/team/issue/ENG-42',
    });
    expect(linearClient.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Fix login bug', priority: 'urgent', teamId: 'team-1' })
    );
  });

  it('asks the agent to generate a description when none is provided', async () => {
    const agent = makeFakeAgent('An LLM-generated description with acceptance criteria.');
    const integration = makeIntegration(agent);
    const linearClient = (integration as any).linear;
    linearClient.createIssue = jest.fn().mockResolvedValue({ issue: { id: 'i1', identifier: 'ENG-1' } });

    await integration.createTask({ title: 'Some task' });

    expect(agent.chat).toHaveBeenCalledTimes(1);
    expect(linearClient.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'An LLM-generated description with acceptance criteria.' })
    );
  });
});
