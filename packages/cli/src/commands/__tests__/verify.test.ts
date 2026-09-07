// Regression test for `tais verify` reporting PASSED (exit 0) even when
// individually-displayed checks show ❌.
//
// verifySkill/verifyAuthor/verifyProvenance each built a `checks[]` array
// for display, but the overall `valid` (and therefore the process exit
// code) was taken straight from a single upstream `result.isValid` flag
// instead of aggregating the very checks the CLI had just printed:
//  - verifySkill's isValid only reflected "not flagged as malicious",
//    so a failing Trust Score or missing Provenance Chain still printed
//    ❌ rows while the command exited 0 / "PASSED".
//  - verifyAuthor's isValid only reflected "has published >0 skills",
//    ignoring a missing Publisher NFT or low Community Reputation.
//  - TaisServiceManager.verifyProvenance hardcodes isValid: true
//    unconditionally, so `tais verify --provenance` always exited 0
//    even though its own "Chain Exists" check is always ❌.
//
// The fix aggregates `checks.every(check => check.passed)`, mirroring
// the fallback/mock branches in the same file, which already did this
// correctly.

import { verifyCommand } from '../verify';
import { TaisServiceManager } from '../../services/TaisServiceManager';

jest.mock('../../services/TaisServiceManager');

const MockedTaisServiceManager = TaisServiceManager as jest.MockedClass<typeof TaisServiceManager>;

const VALID_HASH = 'a'.repeat(64);
const VALID_ADDRESS = '0x' + '1'.repeat(40);

describe('verifyCommand', () => {
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((_code?: number) => undefined) as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    MockedTaisServiceManager.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fails skill verification when Trust Score / Provenance Chain checks fail, even though the service reports isValid: true', async () => {
    MockedTaisServiceManager.mockImplementation(() => ({
      verifySkill: jest.fn().mockResolvedValue({
        trustScore: 0.3, // below the 0.5 threshold -> "Trust Score" check fails
        isBlocked: false, // -> "Community Safety" check passes
        provenance: undefined, // -> "Provenance Chain" check fails
        isValid: true, // the buggy upstream flag: only reflects !isBlocked
      }),
    } as any));

    await verifyCommand(VALID_HASH, {});

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('passes skill verification when every check genuinely passes', async () => {
    MockedTaisServiceManager.mockImplementation(() => ({
      verifySkill: jest.fn().mockResolvedValue({
        trustScore: 0.9,
        isBlocked: false,
        provenance: 'chain-data',
        isValid: true,
      }),
    } as any));

    await verifyCommand(VALID_HASH, {});

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('fails author verification when Publisher NFT / Community Reputation checks fail, even though the service reports isValid: true', async () => {
    MockedTaisServiceManager.mockImplementation(() => ({
      verifyAuthor: jest.fn().mockResolvedValue({
        hasPublisherNft: false, // -> "Publisher NFT" check fails
        authorSkills: 5, // -> "Published Skills" check passes
        reputation: 0.4, // below 0.7 threshold -> "Community Reputation" check fails
        isValid: true, // the buggy upstream flag: only reflects authorSkills > 0
      }),
    } as any));

    await verifyCommand(VALID_ADDRESS, { author: true });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('fails provenance verification when Chain Exists / Auditor Verification checks fail, even though the service hardcodes isValid: true', async () => {
    // This is exactly what TaisServiceManager.verifyProvenance returns in
    // production: a static object with isValid unconditionally true.
    MockedTaisServiceManager.mockImplementation(() => ({
      verifyProvenance: jest.fn().mockResolvedValue({
        provenance: undefined, // -> "Chain Exists" check fails
        isValid: true,
        authorVerified: true,
        auditorCount: 0, // -> "Auditor Verification" check fails
      }),
    } as any));

    await verifyCommand(VALID_HASH, { provenance: true });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
