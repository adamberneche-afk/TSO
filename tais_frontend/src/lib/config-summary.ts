// Natural Language Configuration Summary Generator
// Converts agent configuration to human-readable description

import { AgentConfig, SkillReference, Personality, Autonomy } from '../types/agent';

/**
 * Generates a natural language summary of the agent configuration
 * Provides users with human-readable feedback on their configuration
 */
export function generateConfigSummary(config: AgentConfig): string {
  const parts: string[] = [];
  const agent = config.agent;

  // Opening with name and version
  parts.push(`This is **${agent.name}** (v${agent.version}), your personalized AI assistant.`);

  // Description if present
  if (agent.description) {
    parts.push(`${agent.description}`);
  }

  // Goals section with detail
  if (agent.goals.length > 0) {
    const goalDescriptions: Record<string, string> = {
      'learning': 'helping you learn and acquire new knowledge',
      'work': 'assisting with your professional tasks and productivity',
      'research': 'conducting research and gathering information',
      'code-generation': 'writing, reviewing, and debugging code',
      'data-analysis': 'analyzing data and creating visualizations',
      'writing': 'helping with writing, editing, and content creation',
      'planning': 'organizing schedules, tasks, and long-term planning',
      'communication': 'assisting with emails, messages, and communication',
      'creative': 'supporting creative projects and brainstorming'
    };

    const goalDescriptionsList = agent.goals
      .map(goal => goalDescriptions[goal] || goal)
      .join(', ');
    
    parts.push(`It's configured for ${goalDescriptionsList}.`);
  }

  // Skills section with detail
  if (agent.skills.length > 0) {
    const skillCount = agent.skills.length;
    const skillNames = agent.skills.map(s => formatSkillName(s.id)).join(', ');
    parts.push(`The assistant has access to ${skillCount} specialized skill${skillCount !== 1 ? 's' : ''}: ${skillNames}.`);
  }

  // Personality description
  parts.push(describePersonality(agent.personality));

  // Autonomy level
  parts.push(describeAutonomy(agent.autonomy));

  // Privacy and constraints
  parts.push(describePrivacy(agent.constraints.privacy));

  // Cost awareness
  if (agent.constraints.maxCostPerAction > 0) {
    parts.push(`To manage costs, it's limited to $${agent.constraints.maxCostPerAction} per action.`);
  }

  return parts.join('\n\n');
}

/**
 * Generates a short one-line summary for compact displays
 */
export function generateShortSummary(config: AgentConfig): string {
  const agent = config.agent;
  const goalCount = agent.goals.length;
  const skillCount = agent.skills.length;
  
  return `${agent.name} • ${goalCount} goal${goalCount !== 1 ? 's' : ''} • ${skillCount} skill${skillCount !== 1 ? 's' : ''} • ${agent.personality.tone} tone`;
}

/**
 * Generates bullet-point summary for quick scanning
 */
export function generateBulletSummary(config: AgentConfig): Array<{ label: string; value: string }> {
  const agent = config.agent;
  
  return [
    { label: 'Agent Name', value: agent.name },
    { label: 'Goals', value: agent.goals.map(formatGoalName).join(', ') },
    { label: 'Skills', value: `${agent.skills.length} installed` },
    { label: 'Communication Style', value: formatPersonalitySummary(agent.personality) },
    { label: 'Autonomy Level', value: formatAutonomyLevel(agent.autonomy.level) },
    { label: 'Privacy Mode', value: formatPrivacyLevel(agent.constraints.privacy) },
    { label: 'Cost Limit', value: `$${agent.constraints.maxCostPerAction} per action` }
  ];
}

// Helper functions

function formatSkillName(skillId: string): string {
  // Convert skill-id to Skill Id
  return skillId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatGoalName(goal: string): string {
  const goalNames: Record<string, string> = {
    'learning': 'Learning',
    'work': 'Work',
    'research': 'Research',
    'code-generation': 'Code',
    'data-analysis': 'Analysis',
    'writing': 'Writing',
    'planning': 'Planning',
    'communication': 'Communication',
    'creative': 'Creative'
  };
  return goalNames[goal] || goal;
}

function describePersonality(personality: Personality): string {
  const toneDescriptions: Record<string, string> = {
    'direct': 'gets straight to the point with clear, concise answers',
    'balanced': 'provides well-rounded responses that are neither too brief nor too verbose',
    'conversational': 'communicates in a friendly, chatty manner like a helpful colleague'
  };

  const verbosityDescriptions: Record<string, string> = {
    'brief': 'keeps responses short and to the point',
    'balanced': 'provides just the right amount of detail',
    'detailed': 'gives comprehensive explanations with thorough context'
  };

  const formalityDescriptions: Record<string, string> = {
    'casual': 'uses casual, everyday language',
    'balanced': 'adapts formality based on context',
    'professional': 'maintains a professional, business-appropriate tone'
  };

  return `The assistant ${toneDescriptions[personality.tone]}, ${verbosityDescriptions[personality.verbosity]}, and ${formalityDescriptions[personality.formality]}.`;
}

function describeAutonomy(autonomy: Autonomy): string {
  const autonomyDescriptions: Record<string, string> = {
    'confirm': 'It will ask for your approval before taking any action.',
    'suggest': 'It will suggest actions and wait for your go-ahead.',
    'independent': 'It can take actions autonomously within the constraints you\'ve set.'
  };

  let description = autonomyDescriptions[autonomy.level];

  if (autonomy.requireConfirmationFor && autonomy.requireConfirmationFor.length > 0) {
    const actions = autonomy.requireConfirmationFor.join(', ');
    description += ` However, it will always ask before: ${actions}.`;
  }

  return description;
}

function describePrivacy(privacy: string): string {
  const privacyDescriptions: Record<string, string> = {
    'local': 'Your data stays on your device for maximum privacy.',
    'balanced': 'It uses cloud services selectively while respecting your privacy preferences.',
    'cloud': 'It leverages cloud services to provide the best possible assistance.'
  };

  return privacyDescriptions[privacy] || '';
}

function formatPersonalitySummary(personality: Personality): string {
  return `${personality.tone} • ${personality.verbosity} • ${personality.formality}`;
}

function formatAutonomyLevel(level: string): string {
  const levels: Record<string, string> = {
    'confirm': 'Always confirm',
    'suggest': 'Suggest actions',
    'independent': 'Act independently'
  };
  return levels[level] || level;
}

function formatPrivacyLevel(level: string): string {
  const levels: Record<string, string> = {
    'local': 'Local only',
    'balanced': 'Balanced',
    'cloud': 'Cloud enabled'
  };
  return levels[level] || level;
}

export default {
  generateConfigSummary,
  generateShortSummary,
  generateBulletSummary
};
