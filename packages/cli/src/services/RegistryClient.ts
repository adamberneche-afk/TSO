import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { AuditReport } from '@think/types';

interface TaisConfig {
  registry_url?: string;
}

const CONFIG_PATH = path.join(process.cwd(), '.tais', 'config.json');
const DEFAULT_REGISTRY_URL = 'https://registry.tais.ai';

function loadRegistryUrl(): string {
  if (process.env.TAIS_REGISTRY_URL) {
    return process.env.TAIS_REGISTRY_URL;
  }
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config: TaisConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (config.registry_url) return config.registry_url;
    }
  } catch {
    // Fall through to the default -- a corrupt config.json shouldn't
    // block every command that needs the registry URL.
  }
  return DEFAULT_REGISTRY_URL;
}

/**
 * Strips trailing slashes without a regex -- `/\/+$/` on caller-supplied
 * input is exactly the "polynomial regex on uncontrolled data" shape
 * CodeQL flags (a trailing `+` anchored to `$`), so this walks the
 * string instead: linear, and there's nothing for that class of
 * analysis to flag.
 */
function stripTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url.charCodeAt(end - 1) === 47 /* '/' */) end--;
  return url.slice(0, end);
}

export interface AuditSubmissionResult {
  success: boolean;
  auditId?: string;
  trustScore?: number;
  isBlocked?: boolean;
  error?: string;
}

export interface SkillTrustInfo {
  trustScore: number;
  isBlocked: boolean;
  auditCount: number;
}

/**
 * Thin HTTP client for the parts of the registry the CLI actually needs
 * to call over the network -- there was previously no such client at
 * all (see docs/DOCS_VS_CODEBASE.md row 9): `tais audit`/`tais verify`
 * had real local logic but nothing that ever reached the registry, so
 * an audit "submitted successfully" never left the device and a trust
 * score was always a hardcoded mock value.
 */
export class RegistryClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = stripTrailingSlashes(baseUrl || loadRegistryUrl());
  }

  /**
   * Performs the same nonce -> sign -> login flow tais_frontend's
   * useWallet.ts does interactively in a browser, but headlessly with a
   * wallet the CLI already has the private key for (see
   * packages/cli/src/utils/wallet.ts). Returns a bearer JWT.
   */
  async loginWithWallet(wallet: ethers.Wallet | ethers.HDNodeWallet): Promise<string> {
    const nonceRes = await fetch(`${this.baseUrl}/api/v1/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: wallet.address }),
    });
    if (!nonceRes.ok) {
      throw new Error(`Failed to get auth nonce: ${nonceRes.status} ${await nonceRes.text()}`);
    }
    const { message, nonce } = (await nonceRes.json()) as { message: string; nonce: string };

    const signature = await wallet.signMessage(message);

    const loginRes = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: wallet.address, signature, nonce }),
    });
    if (!loginRes.ok) {
      throw new Error(`Registry login failed: ${loginRes.status} ${await loginRes.text()}`);
    }
    const { token } = (await loginRes.json()) as { token: string };
    return token;
  }

  /**
   * POSTs a signed AuditReport to POST /api/v1/audits. The report's own
   * signature is what actually proves authorship server-side (see
   * routes/audits.ts) -- the bearer token just establishes that the
   * caller is logged in as, and holds an Auditor NFT as, that same
   * wallet, matching the auditorNftMiddleware chain the route sits
   * behind.
   */
  async submitAudit(report: AuditReport, token: string): Promise<AuditSubmissionResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/audits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(report),
    });

    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: body.message || body.error || `Registry returned ${res.status}` };
    }
    return {
      success: true,
      auditId: body.auditId,
      trustScore: body.trustScore,
      isBlocked: body.isBlocked,
    };
  }

  /**
   * Reads back a skill's real audit history and trust score from
   * GET /api/v1/audits/:skillHash. Returns null (rather than throwing)
   * when the registry has never heard of this skill, so callers can
   * fall back to a local-only check instead of treating "not yet
   * published" as a hard error.
   */
  async getSkillAudits(skillHash: string): Promise<(SkillTrustInfo & { auditors: string[] }) | null> {
    const res = await fetch(`${this.baseUrl}/api/v1/audits/${skillHash}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Registry returned ${res.status} fetching audits for ${skillHash}`);
    }
    const body = (await res.json()) as {
      skill: { trustScore: number; isBlocked: boolean };
      audits: Array<{ reporter: string }>;
    };
    return {
      trustScore: body.skill.trustScore,
      isBlocked: body.skill.isBlocked,
      auditCount: body.audits.length,
      auditors: body.audits.map((a) => a.reporter),
    };
  }
}
