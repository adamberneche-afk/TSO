# YARA Security Scanning

## Overview

The TAIS Registry has a **YARA-style security scanning engine**
(`src/services/yaraScanner.ts`) that detects malicious patterns in
submitted content. It is wired up for real in two places:

- **`POST /api/v1/scan`** (`src/routes/scan.ts`) — a standalone,
  authenticated endpoint that scans arbitrary submitted content and
  returns a real result (`safe` / `suspicious` / `malicious`) with the
  matched findings.
- **`POST /api/v1/skills`** (skill publish) — if the skill being published
  has a `packageCid` and IPFS retrieval is enabled
  (`IPFS_ENABLED=true`), the server fetches the package content from IPFS
  and scans it with the same engine before the skill is persisted. A
  `malicious` verdict rejects the publish with `403` and the skill is
  never created. A fetch/scan failure (e.g. IPFS unreachable) fails
  *open* — logged, and the publish proceeds — since this is
  defense-in-depth rather than the only gate on publishing, and IPFS
  retrieval is optional infrastructure; a real `malicious` verdict always
  blocks, though.

Both are mounted authenticated in `src/index.ts`.

## What the Scanner Implements (`src/services/yaraScanner.ts`)

- **Automated Scanning** - `scanFile`, `scanBuffer`, and `scanDirectory` methods
- **Pattern Detection** - credential theft, data exfiltration, malicious domains, process injection, suspicious imports, obfuscated code
- **Severity Classification** - Critical, High, Medium, Low
- **Three backends**, chosen automatically at startup based on what's available in the environment:
  1. **`native`** - the `@automattic/yara` npm module, if installed
  2. **`cli`** - the system `yara` binary, if present on `PATH`
  3. **`pattern`** (default fallback) - a set of hardcoded JavaScript regular expressions that approximate the YARA rules without requiring YARA at all

In practice, unless the native module or CLI binary is fully functional in
the deployment environment, the scanner runs in **pattern mode** — i.e.
the "YARA rules" are really just JS regexes evaluated in-process, not real
YARA rule matching. (Even when the `native` backend is selected at
startup, a call into it can still fail at scan time — e.g. the installed
`@automattic/yara` build not exposing a working `compile()` — in which
case that individual scan transparently falls back to the pattern-based
result rather than erroring.)

## Rules Are Defined In Code, Not in Files

There is **no `yara-rules/` directory checked into the repository** (it's
gitignored — see the root `.gitignore` — since it's only ever a runtime
artifact), and no loadable `.yar` rule files ship with the project. The
six rules below are hardcoded as string templates inside `yaraScanner.ts`
(see `getCredentialTheftRule()`, `getDataExfiltrationRule()`, etc., and
the parallel `getSecurityPatterns()` regex list used by the pattern-mode
backend):

### 1. Credential Theft (`credential_theft`)
**Severity:** Critical

Detects attempts to:
- Access `.env` files
- Read environment variables containing secrets
- Send credentials to external servers

### 2. Data Exfiltration (`data_exfiltration`)
**Severity:** High

Detects:
- Data sent to suspicious domains
- Base64 encoding of sensitive data
- Unusual network requests

### 3. Malicious Domains (`malicious_domains`)
**Severity:** Critical

Blocks known malicious/suspicious domains:
- webhook.site
- requestbin.com
- ngrok.io
- pastebin.com

### 4. Process Injection (`process_injection`)
**Severity:** High

Detects:
- Child process execution
- Code evaluation (eval, Function)
- VM context manipulation

### 5. Suspicious Imports (`suspicious_imports`)
**Severity:** Medium

Flags:
- Dangerous Node.js modules (fs, child_process, net, vm)
- Obfuscated or dynamic require statements

### 6. Obfuscated Code (`obfuscated_code`)
**Severity:** Medium

Detects:
- Base64 encoded payloads
- Hexadecimal encoding
- Unicode escape sequences
- Long encoded strings

If the `native` or `cli` backend is selected, `yaraScanner.ts` will write
these six rules out to a `yara-rules/` directory (created at
`path.join(__dirname, '../../yara-rules')` if missing, and gitignored) so
the real YARA engine/binary can compile and use them. In `pattern` mode
(the default), no files are written — the regexes in
`getSecurityPatterns()` are matched directly against the content.

## Adding or Changing Rules Today

Since there is no rule-loading mechanism from disk in the default
(pattern) mode, the only way to change detection logic right now is to
edit the rule/pattern definitions directly in
`src/services/yaraScanner.ts` (both the YARA rule string templates and
the parallel regex list in `getSecurityPatterns()` need to be kept in
sync) and redeploy.

## Using It

```bash
# Scan arbitrary content
curl -X POST https://tso.onrender.com/api/v1/scan \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"content": "const x = 1;", "filename": "test.js"}'
```

Publishing a skill with `packageCid` set automatically routes the
uploaded package through the same scanner; see `POST /api/v1/skills` in
[API.md](./API.md).

## Current Status Summary

| Piece | Status |
|-------|--------|
| `yaraScanner.ts` scanning logic | Implemented, functional |
| `POST /api/v1/scan` | Real — mounted, authenticated, backed by the real scanner |
| Skill publish path (`POST /api/v1/skills`) | Scans package content via IPFS + the real scanner before persisting; `malicious` blocks the publish |
| `securityScannerService.ts` (a separate, simpler regex-based scanner) | Its PII detector is now wired into `POST /api/v1/scan` as an advisory-only `piiFindings` field; its exploit/malware detectors are still unused (see below) |
| `yara-rules/*.yar` files in repo | **Do not exist** (gitignored, generated only) — rules live in code |

`securityScannerService.ts` is a distinct, simpler pattern-matching class
(exploit/malware/PII detection) that predates or duplicates parts of
`yaraScanner.ts`'s pattern-mode backend. The decision made on it: its PII
detector (SSN/credit-card/email/phone patterns) catches something
`yaraScanner.ts`'s rule set doesn't attempt at all, so `POST /api/v1/scan`
(`routes/scan.ts`) now also calls `detectPII()` and returns its results as
an advisory-only `piiFindings` field — it never affects the blocking
`success`/`result` verdict, since the patterns are approximate (e.g. any
10-digit number reads as a "phone number") and blocking real scans/publishes
on them would be its own new bug. Its `detectExploits`/`detectMalware`
methods were deliberately left unused: they duplicate `yaraScanner.ts`'s
process-injection/credential-theft/data-exfiltration rules with cruder
regexes (e.g. any 16 consecutive digits as a "credit card", any `$(` as
command injection) and add nothing on top of a scanner that already covers
that ground with a real, already-integrated severity model.

## References

- [YARA Documentation](https://yara.readthedocs.io/)
- [YARA Rules Repository](https://github.com/Yara-Rules/rules)
- [Writing YARA Rules](https://yara.readthedocs.io/en/stable/writingrules.html)

---

**Last Updated:** September 7, 2026
