// Regression test for generateStructure() writing a hardcoded
// placeholder ("Content for {title}") into the real Notion page instead
// of the actual LLM-generated content.
//
// The original code combined every section's prompt into a single
// `agent.chat()` call, awaited its response, and then discarded that
// response entirely -- `sections` was built from a hardcoded template
// string, never from anything the LLM returned. That burns a real LLM
// call (and its cost) for a response that is never used, while writing
// throwaway placeholder text into the user's actual Notion workspace.

import { NotionIntegration } from '../index';

jest.mock('@notionhq/client', () => ({
  Client: jest.fn().mockImplementation(() => ({
    pages: {
      create: jest.fn().mockResolvedValue({ id: 'page-123', url: 'https://notion.so/page-123' }),
    },
  })),
}));

function makeFakeAgent(chatResponses: Record<string, string>) {
  return {
    getContext: jest.fn().mockResolvedValue({ walletAddress: '0xabc' }),
    chat: jest.fn().mockImplementation(async ({ messages }: { messages: { content: string }[] }) => {
      const prompt = messages[0].content;
      const match = Object.keys(chatResponses).find(title => prompt.includes(`"${title}"`));
      return { message: match ? chatResponses[match] : undefined };
    }),
    updateMemory: jest.fn().mockResolvedValue({ success: true, entry: {} }),
  } as any;
}

describe('NotionIntegration.generateStructure', () => {
  beforeEach(() => {
    process.env.NOTION_PAGE_ID = 'root-page';
  });

  it('uses the real per-section LLM response instead of a hardcoded placeholder', async () => {
    const agent = makeFakeAgent({
      Introduction: 'This is the real, LLM-written introduction section.',
      Conclusion: 'This is the real, LLM-written conclusion section.',
    });

    const integration = new NotionIntegration({ agent, notionToken: 'fake-token' });

    const result = await integration.generateStructure({
      topic: 'Test Document',
      sections: ['Introduction', 'Conclusion'],
    });

    expect(result.sections).toEqual([
      { title: 'Introduction', content: 'This is the real, LLM-written introduction section.' },
      { title: 'Conclusion', content: 'This is the real, LLM-written conclusion section.' },
    ]);

    // The regression check: the hardcoded placeholder must never appear
    // when the LLM actually returned content.
    for (const section of result.sections) {
      expect(section.content).not.toBe(`Content for ${section.title}`);
    }

    // One chat call per section, not one combined call for everything.
    expect(agent.chat).toHaveBeenCalledTimes(2);
  });

  it('falls back to the placeholder only when the LLM genuinely returns nothing for a section', async () => {
    const agent = makeFakeAgent({}); // every chat() call resolves with message: undefined

    const integration = new NotionIntegration({ agent, notionToken: 'fake-token' });

    const result = await integration.generateStructure({
      topic: 'Test Document',
      sections: ['Introduction'],
    });

    expect(result.sections).toEqual([{ title: 'Introduction', content: 'Content for Introduction' }]);
  });
});
