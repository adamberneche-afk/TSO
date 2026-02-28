/**
 * TAIS Notion Integration
 * 
 * This example demonstrates how to integrate TAIS agents with Notion
 * to create AI-powered document workflows.
 * 
 * Features:
 * - Create documents from agent prompts
 * - Generate page structures automatically
 * - Sync agent memory with Notion databases
 */

import { TAISAgent } from 'tais-agent-sdk';
import { Client } from '@notionhq/client';

export interface NotionIntegrationConfig {
  agent: TAISAgent;
  notionToken: string;
  databaseId?: string;
}

export interface CreateDocumentOptions {
  title: string;
  content: string;
  parentPageId?: string;
  properties?: Record<string, any>;
}

export interface GenerateStructureOptions {
  topic: string;
  sections: string[];
  parentPageId?: string;
}

export class NotionIntegration {
  private agent: TAISAgent;
  private notion: Client;
  private databaseId?: string;

  constructor(config: NotionIntegrationConfig) {
    this.agent = config.agent;
    this.notion = new Client({ auth: config.notionToken });
    this.databaseId = config.databaseId;
  }

  /**
   * Create a new Notion page with AI-generated content
   */
  async createDocument(options: CreateDocumentOptions): Promise<{
    pageId: string;
    url: string;
  }> {
    const context = await this.agent.getContext();
    
    const enhancedContent = await this.agent.chat({
      context,
      messages: [{
        role: 'user',
        content: `Enhance this content for a Notion page. Make it well-structured with headings, bullet points, and clear formatting:\n\n${options.content}`
      }]
    });

    const blocks = this.contentToBlocks(enhancedContent.message || options.content);

    const pageProps: any = {
      parent: options.parentPageId ? { page_id: options.parentPageId } : { page_id: process.env.NOTION_PAGE_ID },
      properties: {
        title: {
          title: [{ text: { content: options.title } }]
        }
      },
      children: blocks
    };

    if (this.databaseId) {
      pageProps.parent = { database_id: this.databaseId };
      pageProps.properties = options.properties || {
        Name: { title: [{ text: { content: options.title } }] }
      };
    }

    const page = await this.notion.pages.create(pageProps);

    await this.agent.updateMemory({
      context,
      update: {
        type: 'action',
        summary: `Created Notion page: ${options.title}`,
        details: { pageId: page.id, url: (page as any).url }
      }
    });

    return {
      pageId: page.id,
      url: (page as any).url
    };
  }

  /**
   * Generate a structured page with multiple sections
   */
  async generateStructure(options: GenerateStructureOptions): Promise<{
    pageId: string;
    url: string;
    sections: { title: string; content: string }[];
  }> {
    const context = await this.agent.getContext();

    const sectionPrompts = options.sections.map(section => 
      `Write content for the "${section}" section of a document about "${options.topic}"`
    ).join('\n\n');

    const responses = await this.agent.chat({
      context,
      messages: [{
        role: 'user',
        content: `Generate content for each section. Provide substantial content for each:\n\n${sectionPrompts}`
      }]
    });

    const sections = options.sections.map((title, index) => ({
      title,
      content: `Content for ${title}` // In production, parse from LLM response
    }));

    const blocks: any[] = [];
    
    blocks.push({
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{ text: { content: options.topic } }]
      }
    });

    for (const section of sections) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: section.title } }]
        }
      });

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: section.content.substring(0, 2000) } }]
        }
      });
    }

    const page = await this.notion.pages.create({
      parent: { page_id: process.env.NOTION_PAGE_ID! },
      properties: {
        title: {
          title: [{ text: { content: options.topic } }]
        }
      },
      children: blocks
    });

    return {
      pageId: page.id,
      url: (page as any).url,
      sections
    };
  }

  /**
   * Sync agent memory to a Notion database
   */
  async syncMemory(): Promise<void> {
    const context = await this.agent.getContext();
    const { memories } = await this.agent.getMemory();

    if (!this.databaseId) {
      throw new Error('Database ID required for memory sync');
    }

    for (const memory of memories.slice(0, 10)) {
      await this.notion.pages.create({
        parent: { database_id: this.databaseId },
        properties: {
          Name: { title: [{ text: { content: memory.summary } }] },
          Type: { select: { name: memory.type } },
          Date: { date: { start: memory.createdAt } }
        }
      });
    }
  }

  /**
   * Query a Notion database using natural language
   */
  async queryDatabase(nlQuery: string): Promise<any[]> {
    const context = await this.agent.getContext();

    if (!this.databaseId) {
      throw new Error('Database ID required for queries');
    }

    const response = await this.agent.chat({
      context,
      messages: [{
        role: 'user',
        content: `Convert this natural language query into Notion API filter properties for a database:\n\n"${nlQuery}"`
      }]
    });

    const filter = this.parseQueryToFilter(nlQuery);

    const results = await this.notion.databases.query({
      database_id: this.databaseId,
      filter
    });

    return results.results;
  }

  private contentToBlocks(content: string): any[] {
    const blocks: any[] = [];
    const paragraphs = content.split('\n\n');

    for (const para of paragraphs) {
      if (para.startsWith('# ')) {
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: { rich_text: [{ text: { content: para.slice(2) } }] }
        });
      } else if (para.startsWith('## ')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ text: { content: para.slice(3) } }] }
        });
      } else if (para.trim()) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: para } }] }
        });
      }
    }

    return blocks;
  }

  private parseQueryToFilter(query: string): any {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('todo') || lowerQuery.includes('task')) {
      return { property: 'Status', select: { does_not_equal: 'Done' } };
    }
    
    if (lowerQuery.includes('high priority')) {
      return { property: 'Priority', select: { equals: 'High' } };
    }

    return undefined;
  }
}

/**
 * Quick start example
 */
export async function example() {
  const agent = new TAISAgent({
    appId: process.env.TAIS_APP_ID!,
    appSecret: process.env.TAIS_APP_SECRET!,
    appName: 'Notion Bot',
    redirectUri: 'http://localhost:3000/callback'
  });

  const notion = new NotionIntegration({
    agent,
    notionToken: process.env.NOTION_TOKEN!,
    databaseId: process.env.NOTION_DATABASE_ID
  });

  // Create a document
  const doc = await notion.createDocument({
    title: 'AI Generated Report',
    content: 'This is my report content about machine learning...'
  });

  console.log('Created:', doc.url);

  // Generate structured document
  const structured = await notion.generateStructure({
    topic: 'Machine Learning Best Practices',
    sections: ['Introduction', 'Data Preparation', 'Model Training', 'Deployment']
  });

  console.log('Created:', structured.url);
}
