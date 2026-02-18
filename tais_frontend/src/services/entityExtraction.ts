import type { ExtractedEntity } from '../types/conversation';

// Entity extraction patterns
const PATTERNS = {
  // Technology patterns
  technologies: [
    /\b(JavaScript|TypeScript|Python|Java|Go|Rust|C\+\+|C#|Ruby|PHP|Swift|Kotlin)\b/gi,
    /\b(React|Vue|Angular|Svelte|Next\.js|Nuxt|Express|Django|Flask|FastAPI|Spring)\b/gi,
    /\b(Node\.js|Docker|Kubernetes|AWS|Azure|GCP|GraphQL|REST|gRPC|WebSocket)\b/gi,
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Firebase)\b/gi,
    /\b(TensorFlow|PyTorch|scikit-learn|Pandas|NumPy|OpenCV)\b/gi,
    /\b(Git|GitHub|GitLab|Jenkins|CircleCI|GitHub Actions|Terraform|Ansible)\b/gi
  ],

  // Role patterns
  roles: [
    /\b(software engineer|developer|architect|manager|director|lead|senior|junior)\b/gi,
    /\b(frontend|backend|full.?stack|devops|data|machine learning|AI|security)\b/gi,
    /\b(product manager|project manager|scrum master|CTO|CEO|VP|head of)\b/gi
  ],

  // Duration patterns
  durations: [
    /\b(\d+)\s*(years?|yrs?)\b/gi,
    /\b(\d+)\s*(months?)\b/gi,
    /\b(\d+)\+?\s*years?\s*of\s*experience\b/gi,
    /\bover\s*(\d+)\s*years?\b/gi,
    /\b(\d+)-(\d+)\s*years?\b/gi
  ],

  // Proficiency indicators
  proficiencies: [
    { pattern: /\b(expert|advanced|proficient|mastery)\b/gi, level: 0.9 },
    { pattern: /\b(experienced|skilled|strong|comfortable|confident)\b/gi, level: 0.75 },
    { pattern: /\b(intermediate|familiar|working knowledge)\b/gi, level: 0.5 },
    { pattern: /\b(beginner|novice|learning|basic|some)\b/gi, level: 0.25 }
  ],

  // Company patterns (simplified)
  companies: [
    /\b(Google|Microsoft|Amazon|Apple|Meta|Netflix|Uber|Airbnb|Spotify|Stripe)\b/gi,
    /\b(startup|company|firm|agency|consultancy)\b/gi
  ],

  // Date patterns
  dates: [
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
    /\b(\d{4})\b/g
  ]
};

// Context-based entity extraction
export function extractEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const lowerText = text.toLowerCase();

  // Extract technologies
  PATTERNS.technologies.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'technology',
        value: match[1] || match[0],
        confidence: 0.9,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  });

  // Extract roles
  PATTERNS.roles.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Check for context to determine if it's a current role
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 50);
      const context = text.slice(contextStart, contextEnd).toLowerCase();
      
      const isCurrent = context.includes('current') || 
                       context.includes('now') || 
                       context.includes('am a') ||
                       context.includes('working as');
      
      entities.push({
        type: 'role',
        value: match[1] || match[0],
        confidence: isCurrent ? 0.95 : 0.7,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  });

  // Extract durations
  PATTERNS.durations.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1] ? `${match[1]} ${match[2]}` : match[0];
      entities.push({
        type: 'duration',
        value,
        confidence: 0.85,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  });

  // Extract proficiencies with context
  PATTERNS.proficiencies.forEach(({ pattern, level }) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Look for nearby technologies
      const contextStart = Math.max(0, match.index - 100);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 100);
      const context = text.slice(contextStart, contextEnd);
      
      // Find technologies in the context
      const techPattern = /\b(JavaScript|TypeScript|Python|React|Node\.js|AWS|Docker|Kubernetes|GraphQL|PostgreSQL|MongoDB)\b/gi;
      let techMatch;
      while ((techMatch = techPattern.exec(context)) !== null) {
        entities.push({
          type: 'proficiency',
          value: `${techMatch[1]}: ${match[0]}`,
          confidence: level,
          startIndex: contextStart + techMatch.index,
          endIndex: contextStart + techMatch.index + techMatch[0].length
        });
      }
    }
  });

  // Extract skills (general technical terms not caught by technology patterns)
  const skillPatterns = [
    /\b(frontend|backend|database|API|microservices|cloud|security|testing|CI\/CD)\b/gi,
    /\b(agile|scrum|kanban|waterfall)\b/gi,
    /\b(mobile|web|desktop|embedded|IoT)\b/gi
  ];

  skillPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'skill',
        value: match[1] || match[0],
        confidence: 0.7,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  });

  // Extract companies
  PATTERNS.companies.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'company',
        value: match[1] || match[0],
        confidence: 0.6,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  });

  // Extract experiences (project descriptions, achievements)
  const experiencePatterns = [
    /\b(built|developed|created|designed|implemented|architected|led|managed)\s+([^.,]+)/gi,
    /\b(worked on|contributed to|maintained|optimized|refactored)\s+([^.,]+)/gi
  ];

  experiencePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const action = match[1];
      const object = match[2] || '';
      if (object.length > 5) { // Filter out very short matches
        entities.push({
          type: 'experience',
          value: `${action} ${object.trim()}`,
          confidence: 0.65,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }
  });

  // Remove duplicates and sort by confidence
  const uniqueEntities = entities.filter((entity, index, self) => 
    index === self.findIndex(e => 
      e.type === entity.type && 
      e.value.toLowerCase() === entity.value.toLowerCase()
    )
  );

  return uniqueEntities.sort((a, b) => b.confidence - a.confidence);
}

// Extract semantic insights from text
export interface SemanticAnalysis {
  sentiment: number;
  topics: string[];
  intent: string;
  complexity: number;
}

export function analyzeSemantics(text: string): SemanticAnalysis {
  const lowerText = text.toLowerCase();
  
  // Simple sentiment analysis
  const positiveWords = ['love', 'enjoy', 'passionate', 'excited', 'great', 'excellent', 'best', 'amazing', 'wonderful'];
  const negativeWords = ['hate', 'dislike', 'frustrated', 'difficult', 'hard', 'challenging', 'bad', 'terrible'];
  
  let sentimentScore = 0.5; // neutral
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) sentimentScore += 0.1;
  });
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) sentimentScore -= 0.1;
  });
  sentimentScore = Math.max(0, Math.min(1, sentimentScore));

  // Topic extraction
  const topics: string[] = [];
  const topicIndicators: Record<string, string[]> = {
    'frontend': ['react', 'vue', 'angular', 'css', 'html', 'ui', 'ux', 'design'],
    'backend': ['api', 'server', 'database', 'microservices', 'architecture'],
    'devops': ['docker', 'kubernetes', 'ci/cd', 'deployment', 'infrastructure'],
    'ai/ml': ['machine learning', 'ai', 'data science', 'tensorflow', 'pytorch'],
    'management': ['lead', 'manager', 'team', 'project', 'agile', 'scrum']
  };

  Object.entries(topicIndicators).forEach(([topic, indicators]) => {
    if (indicators.some(indicator => lowerText.includes(indicator))) {
      topics.push(topic);
    }
  });

  // Intent classification
  let intent = 'informative';
  if (/\b(looking for|seeking|want|interested in)\b/i.test(text)) intent = 'seeking';
  else if (/\b(have|with|experience in|worked on)\b/i.test(text)) intent = 'describing';
  else if (/\b(learn|improve|grow|develop)\b/i.test(text)) intent = 'learning';

  // Complexity score based on text length and vocabulary
  const words = text.split(/\s+/);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const complexity = Math.min(1, (words.length / 100) * 0.5 + (uniqueWords.size / words.length) * 0.5);

  return {
    sentiment: sentimentScore,
    topics,
    intent,
    complexity
  };
}
