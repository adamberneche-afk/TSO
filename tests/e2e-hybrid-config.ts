// E2E Test: Hybrid JSON + Markdown Personality Configuration
// Tests the complete flow from frontend components to backend persistence

import { validatePersonalityMarkdown, TIER_LIMITS, estimateTokenCount } from '../tais_frontend/src/services/personalityValidator';
import { compilePersonality, generateDefaultPersonality, markdownToHtml } from '../tais_frontend/src/services/personalityCompiler';

console.log('========================================');
console.log('E2E Test: Hybrid Config Implementation');
console.log('Date:', new Date().toISOString());
console.log('========================================\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name} - returned false`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name} - ${error}`);
    failed++;
  }
}

// ============================================
// PHASE 1: Validator Tests
// ============================================
console.log('\n--- Phase 1: Personality Validator ---\n');

test('Validator: Valid markdown passes', () => {
  const md = '# Test Agent\n\n## Identity\nThis is a test.';
  const result = validatePersonalityMarkdown(md, 'bronze');
  return result.valid === true;
});

test('Validator: Empty markdown fails', () => {
  const result = validatePersonalityMarkdown('', 'bronze');
  return result.valid === false && result.errors.includes('Personality markdown cannot be empty');
});

test('Validator: Size limit enforced for tier', () => {
  const largeMd = 'x'.repeat(15 * 1024); // 15KB
  const result = validatePersonalityMarkdown(largeMd, 'bronze'); // 10KB limit
  return result.valid === false && result.errors.some((e: string) => e.includes('exceeds'));
});

test('Validator: Gold tier allows larger size', () => {
  const md = 'x'.repeat(30 * 1024); // 30KB
  const result = validatePersonalityMarkdown(md, 'gold'); // 50KB limit
  return result.valid === true;
});

test('Validator: Dangerous patterns detected', () => {
  const md = '# Agent\n\n<script>alert(1)</script>';
  const result = validatePersonalityMarkdown(md, 'bronze');
  return result.errors.some((e: string) => e.includes('dangerous'));
});

test('Validator: Token count estimation', () => {
  const md = 'This is a test sentence with several words.';
  const tokens = estimateTokenCount(md);
  return tokens > 0 && tokens < 20;
});

// ============================================
// PHASE 2: Compiler Tests
// ============================================
console.log('\n--- Phase 2: Personality Compiler ---\n');

test('Compiler: Compiles valid markdown', () => {
  const md = `# Dev Assistant

## Identity
You are a developer assistant.

## Communication Style
- Tone: Direct
- Detail: Comprehensive

## Response Guidelines
1. Be helpful
2. Be accurate
`;
  const result = compilePersonality(md, 1, 'bronze');
  return result.systemPrompt.length > 0 && result.tokenCount > 0;
});

test('Compiler: Version string generated', () => {
  const md = '# Test\n\n## Section\nContent';
  const result = compilePersonality(md, 1, 'bronze');
  return result.version.startsWith('v1-');
});

test('Compiler: Sections extracted correctly', () => {
  const md = `# Main Title

## Section One
Content for section one.

## Section Two
Content for section two.
`;
  const result = compilePersonality(md, 1, 'bronze');
  return result.sections.length === 3 && 
         result.sections[0].title === 'Main Title' &&
         result.sections[1].title === 'Section One';
});

test('Compiler: Invalid markdown throws error', () => {
  try {
    compilePersonality('', 1, 'bronze');
    return false;
  } catch {
    return true;
  }
});

// ============================================
// PHASE 3: Default Personality Generation
// ============================================
console.log('\n--- Phase 3: Default Personality Generator ---\n');

test('Generator: Creates personality from sliders', () => {
  const md = generateDefaultPersonality(
    'TestBot',
    { tone: 'direct', verbosity: 'brief', formality: 'casual' },
    ['Help users', 'Answer questions']
  );
  return md.includes('# TestBot') && 
         md.includes('Get to the point') && // "direct" tone description
         md.includes('Help users');
});

test('Generator: Handles all personality combinations', () => {
  const combinations = [
    { tone: 'direct' as const, verbosity: 'brief' as const, formality: 'casual' as const },
    { tone: 'balanced' as const, verbosity: 'balanced' as const, formality: 'balanced' as const },
    { tone: 'conversational' as const, verbosity: 'detailed' as const, formality: 'professional' as const },
  ];
  
  for (const combo of combinations) {
    const md = generateDefaultPersonality('Agent', combo, []);
    if (!md.includes('# Agent')) return false;
  }
  return true;
});

// ============================================
// PHASE 4: HTML Conversion
// ============================================
console.log('\n--- Phase 4: Markdown to HTML ---\n');

test('HTML: Converts markdown to HTML', () => {
  const md = '# Title\n\n**Bold** and *italic*';
  const html = markdownToHtml(md);
  return html.includes('<h1') && html.includes('<strong>') && html.includes('<em>');
});

test('HTML: Sanitizes dangerous content', () => {
  const md = '# Title\n\n<script>alert(1)</script>';
  const html = markdownToHtml(md);
  return !html.includes('<script>');
});

// ============================================
// PHASE 5: Tier Limits
// ============================================
console.log('\n--- Phase 5: Tier Limits ---\n');

test('Tiers: Free tier has 5KB limit', () => {
  return TIER_LIMITS.free.maxSizeBytes === 5 * 1024;
});

test('Tiers: Bronze tier has 10KB limit', () => {
  return TIER_LIMITS.bronze.maxSizeBytes === 10 * 1024;
});

test('Tiers: Silver tier has 20KB limit', () => {
  return TIER_LIMITS.silver.maxSizeBytes === 20 * 1024;
});

test('Tiers: Gold tier has 50KB limit', () => {
  return TIER_LIMITS.gold.maxSizeBytes === 50 * 1024;
});

// ============================================
// Summary
// ============================================
console.log('\n========================================');
console.log('Test Summary');
console.log('========================================');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);
console.log(`Status: ${failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
