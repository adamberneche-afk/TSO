import DOMPurify from 'dompurify';

export interface PersonalityTierLimits {
  maxSizeBytes: number;
  tier: 'free' | 'bronze' | 'silver' | 'gold';
}

export const TIER_LIMITS: Record<string, PersonalityTierLimits> = {
  free: { maxSizeBytes: 5 * 1024, tier: 'free' },
  bronze: { maxSizeBytes: 10 * 1024, tier: 'bronze' },
  silver: { maxSizeBytes: 20 * 1024, tier: 'silver' },
  gold: { maxSizeBytes: 50 * 1024, tier: 'gold' },
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sizeBytes: number;
  sanitized?: string;
}

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:\s*text\/html/gi,
];

export function validatePersonalityMarkdown(
  markdown: string,
  tier: 'free' | 'bronze' | 'silver' | 'gold' = 'bronze'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const limits = TIER_LIMITS[tier];
  const sizeBytes = new Blob([markdown]).size;

  if (sizeBytes > limits.maxSizeBytes) {
    errors.push(
      `Personality exceeds ${limits.maxSizeBytes / 1024}KB limit for ${tier} tier (current: ${(sizeBytes / 1024).toFixed(1)}KB)`
    );
  }

  if (!markdown || markdown.trim().length === 0) {
    errors.push('Personality markdown cannot be empty');
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(markdown)) {
      errors.push(`Potentially dangerous content detected: ${pattern.source}`);
    }
  }

  if (markdown.length > 0 && !markdown.includes('#')) {
    warnings.push('Consider adding section headers (##) for better structure');
  }

  if (!markdown.includes('## ') && !markdown.includes('### ')) {
    warnings.push('Consider adding subsections for better organization');
  }

  const sanitized = DOMPurify.sanitize(markdown, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'strong', 'em', 'b', 'i',
      'code', 'pre',
      'blockquote',
      'a',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sizeBytes,
    sanitized,
  };
}

export function estimateTokenCount(markdown: string): number {
  const words = markdown.split(/\s+/).filter(w => w.length > 0);
  return Math.ceil(words.length * 1.3);
}

export function getTierFromNftValue(usdValue: number): 'free' | 'bronze' | 'silver' | 'gold' {
  if (usdValue >= 100) return 'gold';
  if (usdValue >= 50) return 'silver';
  if (usdValue >= 10) return 'bronze';
  return 'free';
}
