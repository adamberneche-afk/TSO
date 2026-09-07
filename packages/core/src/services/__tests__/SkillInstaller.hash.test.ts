// Regression tests for calculateSkillHash's two bugs:
//
// 1. `JSON.stringify(manifest, Object.keys(manifest).sort())` uses the
//    second argument as a replacer *array*, which JSON.stringify applies
//    recursively at every nesting level. Since only top-level key names
//    were in the array, every nested object (permissions, provenance, ...)
//    serialized as `{}` regardless of its actual content -- two manifests
//    with completely different permissions hashed identically.
// 2. The hash was computed over JSON that included the skill_hash field
//    itself, making correct verification (hash === skill_hash) a SHA-256
//    fixed point -- practically unsatisfiable, so no manifest could ever
//    pass verifyManifest's hash check.

import { SkillInstaller } from '../SkillInstaller';
import { SkillManifest } from '@think/types';

function baseManifest(overrides: Partial<SkillManifest> = {}): SkillManifest {
  return {
    name: 'test-skill',
    version: '1.0.0',
    description: 'a test skill',
    author: '0x' + '1'.repeat(40),
    skill_hash: '',
    permissions: {
      env_vars: [],
      modules: [],
    },
    provenance: {
      author_signature: 'sig',
      auditors: [],
      isnad_chain: [],
      trust_score: 0,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('SkillInstaller.calculateSkillHash', () => {
  // installer.calculateSkillHash doesn't touch any of the constructor
  // dependencies, so a minimal stub is fine here.
  const installer = Object.create(SkillInstaller.prototype) as SkillInstaller;

  it('produces different hashes for manifests with different nested permissions', () => {
    const safe = baseManifest({
      permissions: { env_vars: [], modules: [], network: { domains: ['ok.com'], allowed_methods: ['GET'] } },
    });
    const malicious = baseManifest({
      permissions: { env_vars: ['SECRET'], modules: [], network: { domains: ['evil.com'], allowed_methods: ['GET', 'POST'] } },
    });

    expect(installer.calculateSkillHash(safe)).not.toBe(installer.calculateSkillHash(malicious));
  });

  it('is not affected by the value of skill_hash itself', () => {
    const withHashA = baseManifest({ skill_hash: 'aaaa' });
    const withHashB = baseManifest({ skill_hash: 'bbbb' });

    expect(installer.calculateSkillHash(withHashA)).toBe(installer.calculateSkillHash(withHashB));
  });

  it('lets a real manifest satisfy its own hash check (the fixed-point bug is gone)', () => {
    const manifest = baseManifest();
    const realHash = installer.calculateSkillHash(manifest);
    const signed = { ...manifest, skill_hash: realHash };

    // This is exactly what verifyManifest checks.
    expect(installer.calculateSkillHash(signed)).toBe(signed.skill_hash);
  });

  it('is stable regardless of key insertion order', () => {
    const a = baseManifest();
    const b: SkillManifest = {
      updated_at: a.updated_at,
      created_at: a.created_at,
      provenance: a.provenance,
      permissions: a.permissions,
      skill_hash: a.skill_hash,
      author: a.author,
      description: a.description,
      version: a.version,
      name: a.name,
    };

    expect(installer.calculateSkillHash(a)).toBe(installer.calculateSkillHash(b));
  });
});
