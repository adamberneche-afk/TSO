// Regression tests for path traversal in skill install/uninstall.
//
// manifest.name (installSkill, via verifyManifest) and skillName
// (uninstallSkill, getInstalledSkillManifest) all reach
// path.join(this.skillsPath, name) followed by fs.writeFile /
// fs.rm(recursive: true, force: true) / a manifest.json read, with no
// validation beyond "non-empty". A name like "../victim" escapes the
// skills directory entirely -- installSkill could write a
// manifest/skill.js/permissions.json into an arbitrary sibling
// directory, uninstallSkill could recursively delete one, and
// getInstalledSkillManifest could read a file that was never installed
// as a skill at all.
//
// uninstallSkill and getInstalledSkillManifest exercise the shared
// resolveSkillDir() path-containment fix directly against the real
// filesystem, with no network dependency. verifyManifest's own name-
// format check (the first line of defense installSkill relies on) is
// also exercised directly, stubbing out the unrelated on-chain
// publisher-token check so this test doesn't depend on real RPC access.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { SkillInstaller } from '../SkillInstaller';
import { IsnadService } from '../IsnadService';
import { AuditRegistry } from '../AuditRegistry';
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

describe('SkillInstaller path traversal', () => {
  let userDataPath: string;
  let installer: SkillInstaller;

  beforeEach(() => {
    userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-installer-test-'));
    // rpcUrl is never actually reached by uninstallSkill/getInstalledSkillManifest
    // (no network calls on those paths), so any placeholder value is fine here.
    const isnadService = new IsnadService('http://127.0.0.1:1', userDataPath);
    const auditRegistry = new AuditRegistry('http://127.0.0.1:1', userDataPath);
    installer = new SkillInstaller(isnadService, auditRegistry, userDataPath);
  });

  afterEach(() => {
    fs.rmSync(userDataPath, { recursive: true, force: true });
  });

  it('rejects a traversal name in verifyManifest, the check installSkill relies on', async () => {
    // Stub out the parts of verifyManifest that need real chain access
    // (the publisher token-holding gate and provenance/trust-score
    // verification) -- unrelated to this fix, and this test would
    // otherwise depend on outbound RPC access this environment doesn't
    // have.
    jest.spyOn((installer as any).tokenService, 'verifyMinThinkTokens').mockResolvedValue(true);
    jest.spyOn((installer as any).isnadService, 'verifyProvenance').mockResolvedValue(true);

    const manifest = baseManifest({ name: '../../outside-skills-dir' });
    const result = await installer.verifyManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/letters, numbers, hyphens, and underscores/i)])
    );
  });

  it('does not let uninstallSkill delete a sibling directory outside the skills folder', async () => {
    // A real, unrelated directory that happens to sit next to the skills
    // folder -- exactly the kind of thing "../victim" could reach.
    const victimDir = path.join(userDataPath, 'victim-app-data');
    fs.mkdirSync(victimDir);
    fs.writeFileSync(path.join(victimDir, 'important.txt'), 'do not delete me');

    // skillsPath is userDataPath/skills, so this traversal targets
    // userDataPath/victim-app-data.
    const result = await installer.uninstallSkill('../victim-app-data');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/letters, numbers, hyphens, and underscores/i);
    // The regression check: the victim directory must be completely
    // untouched.
    expect(fs.existsSync(victimDir)).toBe(true);
    expect(fs.readFileSync(path.join(victimDir, 'important.txt'), 'utf-8')).toBe('do not delete me');
  });

  it('does not let getInstalledSkillManifest read a file outside the skills folder', async () => {
    const secretDir = path.join(userDataPath, 'secret');
    fs.mkdirSync(secretDir);
    fs.writeFileSync(path.join(secretDir, 'manifest.json'), JSON.stringify({ leaked: true }));

    const result = await installer.getInstalledSkillManifest('../secret');

    expect(result).toBeNull();
  });

  it('still resolves, reads, and uninstalls a real skill directory with a legitimate name', async () => {
    // Exercise the real (non-network) filesystem path -- installSkill's
    // own writeFile calls, without going through installSkill itself
    // (which requires real on-chain publisher verification this
    // environment can't perform).
    const skillDir = path.join(userDataPath, 'skills', 'my-valid-skill-1');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'manifest.json'), JSON.stringify(baseManifest({ name: 'my-valid-skill-1' })));

    const readBack = await installer.getInstalledSkillManifest('my-valid-skill-1');
    expect(readBack?.name).toBe('my-valid-skill-1');

    const uninstallResult = await installer.uninstallSkill('my-valid-skill-1');
    expect(uninstallResult.success).toBe(true);
    expect(fs.existsSync(skillDir)).toBe(false);
  });
});
