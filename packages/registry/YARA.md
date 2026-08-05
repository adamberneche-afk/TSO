# YARA Security Scanning

## Overview

The TAIS Registry has a **YARA-style security scanning engine** (`src/services/yaraScanner.ts`) capable of detecting malicious patterns in skill packages. However, this scanner is **not currently wired up to any HTTP route or upload flow**:

- `src/routes/scan.ts` only implements a single `POST /` handler, and it is a **placeholder** — it ignores the uploaded package entirely and always returns a hardcoded `"clean"` result. It does not call `yaraScanner` or `securityScannerService` at all.
- The `scan` router (`scanRoutes`) is exported from `scan.ts` but is **never imported or mounted** in `src/index.ts`, so none of it — not even the placeholder — is reachable on a running server.
- `yaraScanner.ts` and `src/services/securityScannerService.ts` (which wraps it) are not referenced from any route file, so the real scanning logic described below is effectively dead code today.

This document describes what the scanner **can do** if wired up, not a live API.

## What the Scanner Implements (`src/services/yaraScanner.ts`)

- **Automated Scanning** - `scanFile`, `scanBuffer`, and `scanDirectory` methods
- **Pattern Detection** - credential theft, data exfiltration, malicious domains, process injection, suspicious imports, obfuscated code
- **Severity Classification** - Critical, High, Medium, Low
- **Three backends**, chosen automatically at startup based on what's available in the environment:
  1. **`native`** - the `@automattic/yara` npm module, if installed
  2. **`cli`** - the system `yara` binary, if present on `PATH`
  3. **`pattern`** (default fallback) - a set of hardcoded JavaScript regular expressions that approximate the YARA rules without requiring YARA at all

In practice, unless the native module or CLI binary has been installed in the deployment environment, the scanner runs in **pattern mode** — i.e. the "YARA rules" are really just JS regexes evaluated in-process, not real YARA rule matching.

## Rules Are Defined In Code, Not in Files

There is **no `yara-rules/` directory checked into the repository**, and no loadable `.yar` rule files ship with the project. The six rules below are hardcoded as string templates inside `yaraScanner.ts` (see `getCredentialTheftRule()`, `getDataExfiltrationRule()`, etc., and the parallel `getSecurityPatterns()` regex list used by the pattern-mode backend):

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

If the `native` or `cli` backend is selected, `yaraScanner.ts` will write these six rules out to a `yara-rules/` directory (created at `path.join(__dirname, '../../yara-rules')` if missing) so the real YARA engine/binary can compile and use them. In `pattern` mode (the default), no files are written — the regexes in `getSecurityPatterns()` are matched directly against file contents.

## Adding or Changing Rules Today

Since there is no rule-loading mechanism from disk in the default (pattern) mode, the only way to change detection logic right now is to edit the rule/pattern definitions directly in `src/services/yaraScanner.ts` (both the YARA rule string templates and the parallel regex list in `getSecurityPatterns()` need to be kept in sync) and redeploy.

## Current Status Summary

| Piece | Status |
|-------|--------|
| `yaraScanner.ts` scanning logic | Implemented, functional in isolation |
| `securityScannerService.ts` | Implemented, wraps `yaraScanner` |
| `POST /` in `scan.ts` | Placeholder only — always returns a fake `"clean"` result |
| Scan router mounted in `src/index.ts` | **Not mounted** — unreachable |
| `yara-rules/*.yar` files in repo | **Do not exist** — rules live in code |

## References

- [YARA Documentation](https://yara.readthedocs.io/)
- [YARA Rules Repository](https://github.com/Yara-Rules/rules)
- [Writing YARA Rules](https://yara.readthedocs.io/en/stable/writingrules.html)

---

**Last Updated:** August 5, 2026
