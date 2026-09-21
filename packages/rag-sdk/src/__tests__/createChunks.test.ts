// Regression test for the createChunks() infinite-loop bug.
//
// createChunks() advances `start` by `chunkSize - overlap` each
// iteration. When overlap >= chunkSize that step is zero or negative,
// so `start` never passes content.length and the loop never
// terminates -- previously masked by an `if (start < 0) start = 0`
// guard that just reset `start` back to 0 forever on a negative step,
// instead of ending the loop. createChunks is a publicly exported SDK
// function (`export * from './crypto.js'` in index.ts), so any
// third-party caller passing overlap >= chunkSize would hang their
// process rather than getting an error.

import { describe, it, expect } from 'vitest';
import { createChunks } from '../crypto';

describe('createChunks', () => {
  it('still chunks normally for a valid chunkSize/overlap pair', () => {
    const content = 'a'.repeat(100);
    const chunks = createChunks(content, 20, 5);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('').length).toBeGreaterThanOrEqual(content.length);
    // Rejoining overlapping chunks should reconstruct the full content
    // once overlap is accounted for.
    expect(chunks[0].length).toBe(20);
  });

  it('throws instead of hanging when overlap equals chunkSize', () => {
    expect(() => createChunks('some content here', 20, 20)).toThrow(/overlap/i);
  });

  it('throws instead of hanging when overlap exceeds chunkSize', () => {
    expect(() => createChunks('some content here', 20, 50)).toThrow(/overlap/i);
  });

  it('throws for a non-positive chunkSize', () => {
    expect(() => createChunks('some content', 0, 0)).toThrow(/chunkSize/i);
    expect(() => createChunks('some content', -5, 0)).toThrow(/chunkSize/i);
  });

  it('throws for a negative overlap', () => {
    expect(() => createChunks('some content', 20, -1)).toThrow(/overlap/i);
  });
});
