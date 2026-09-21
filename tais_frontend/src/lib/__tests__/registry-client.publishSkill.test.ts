// Regression test for the two bugs that made `registryClient.publishSkill`
// an orphaned method that had never actually been exercised end-to-end
// (docs/DOCS_VS_CODEBASE.md row 22): it double-wrapped the request body as
// `{ data: skillData }` (api.post's second argument IS the body), and it
// swallowed every error -- auth, validation, the server's real "Publisher
// NFT required" 403 -- into a silent `null`, giving a caller no way to
// tell success from failure or show the user why.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();

vi.mock('../../api/client', () => ({
  api: { post: (...args: unknown[]) => post(...args) },
}));

import { registryClient } from '../registry-client';
import type { CreateSkillDTO } from '../../types/registry';

const dto: CreateSkillDTO = {
  name: 'my-skill',
  version: '1.0.0',
  skillHash: 'Qm' + 'a'.repeat(44),
  manifestCid: 'Qm' + 'b'.repeat(44),
  author: '0x1111111111111111111111111111111111111111',
};

describe('registryClient.publishSkill', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('sends the DTO itself as the request body, not wrapped in { data: ... }', async () => {
    post.mockResolvedValue({ id: 's1', ...dto, trustScore: 0, downloadCount: 0 });

    await registryClient.publishSkill(dto);

    expect(post).toHaveBeenCalledWith('/api/v1/skills', dto);
  });

  it('propagates the real error instead of swallowing it into null', async () => {
    post.mockRejectedValue(new Error('Publishing skills requires a THINK Genesis NFT or Publisher NFT'));

    await expect(registryClient.publishSkill(dto)).rejects.toThrow(
      'Publishing skills requires a THINK Genesis NFT or Publisher NFT'
    );
  });

  it('resolves with the created skill on success', async () => {
    const created = { id: 's1', ...dto, trustScore: 0, downloadCount: 0 };
    post.mockResolvedValue(created);

    const result = await registryClient.publishSkill(dto);

    expect(result).toEqual(created);
  });
});
