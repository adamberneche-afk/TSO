import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { validatePersonalityMarkdown, estimateTokenCount } from './personalityValidator';

export interface CompiledPersonality {
  systemPrompt: string;
  tokenCount: number;
  version: string;
  sections: PersonalitySection[];
}

export interface PersonalitySection {
  title: string;
  content: string;
  level: number;
}

marked.setOptions({
  gfm: true,
  breaks: true,
});

function extractSections(markdown: string): PersonalitySection[] {
  const sections: PersonalitySection[] = [];
  const lines = markdown.split('\n');
  let currentSection: PersonalitySection | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headerMatch) {
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        sections.push(currentSection);
      }
      
      currentSection = {
        level: headerMatch[1].length,
        title: headerMatch[2].trim(),
        content: '',
      };
      contentLines = [];
    } else if (currentSection) {
      contentLines.push(line);
    }
  }

  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    sections.push(currentSection);
  }

  return sections;
}

function markdownToSystemPrompt(markdown: string, sections: PersonalitySection[]): string {
  const promptParts: string[] = [];

  const mainTitle = sections.find(s => s.level === 1);
  if (mainTitle) {
    promptParts.push(`You are ${mainTitle.title}.`);
  }

  for (const section of sections) {
    if (section.level === 1) continue;

    const cleanContent = section.content
      .replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```(\w*)\n?/g, '').replace(/```/g, '');
      })
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (cleanContent) {
      promptParts.push(`\n## ${section.title}\n${cleanContent}`);
    }
  }

  return promptParts.join('\n');
}

export function compilePersonality(
  markdown: string,
  currentVersion: number = 1,
  tier: 'free' | 'bronze' | 'silver' | 'gold' = 'bronze'
): CompiledPersonality {
  const validation = validatePersonalityMarkdown(markdown, tier);
  
  if (!validation.valid) {
    throw new Error(`Invalid personality markdown: ${validation.errors.join(', ')}`);
  }

  const sanitized = validation.sanitized || markdown;
  const sections = extractSections(sanitized);
  const systemPrompt = markdownToSystemPrompt(sanitized, sections);
  const tokenCount = estimateTokenCount(systemPrompt);
  const version = `v${currentVersion}-${Date.now()}`;

  return {
    systemPrompt,
    tokenCount,
    version,
    sections,
  };
}

export function generateDefaultPersonality(
  name: string,
  personality: {
    tone: 'direct' | 'balanced' | 'conversational';
    verbosity: 'brief' | 'balanced' | 'detailed';
    formality: 'casual' | 'balanced' | 'professional';
  },
  goals: string[]
): string {
  const toneDescriptions = {
    direct: 'Get to the point quickly. Avoid unnecessary explanations.',
    balanced: 'Provide clear explanations with appropriate detail.',
    conversational: 'Be friendly and engaging. Provide context and examples.',
  };

  const verbosityDescriptions = {
    brief: 'Keep responses concise. Focus on essential information only.',
    balanced: 'Provide moderate detail with key context.',
    detailed: 'Provide comprehensive explanations with full context and examples.',
  };

  const formalityDescriptions = {
    casual: 'Use relaxed, friendly language. Informal tone is acceptable.',
    balanced: 'Professional yet approachable. Use industry-standard terminology.',
    professional: 'Use formal, business-appropriate language.',
  };

  const goalsList = goals.length > 0 
    ? goals.map(g => `- ${g}`).join('\n')
    : '- General assistance';

  return `# ${name}

## Identity
You are an AI assistant designed to help users effectively.

## Communication Style
- **Tone:** ${toneDescriptions[personality.tone]}
- **Detail Level:** ${verbosityDescriptions[personality.verbosity]}
- **Formality:** ${formalityDescriptions[personality.formality]}

## Goals
${goalsList}

## Response Guidelines
1. Be helpful and accurate
2. Ask clarifying questions when needed
3. Provide actionable suggestions
4. Acknowledge limitations when appropriate

## Domain Knowledge
- General purpose assistance
- Adapts to user needs and context
`;
}

export function markdownToHtml(markdown: string): string {
  const sanitized = DOMPurify.sanitize(markdown);
  return marked.parse(sanitized) as string;
}
