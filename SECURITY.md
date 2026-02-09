# Security Policy

## Supported Versions
| Version | Supported          | Status |  
| ------- | ------------------ | ------ |  
| 1.6.x   | ✅ Yes             | Current (Audited) |  
| 1.5.x   | ⚠️ Security fixes only | Deprecated |  
| < 1.5   | ❌ No              | Unsupported |

## Security Audit Status
**TAIS v1.6** passed a comprehensive third-party security audit in **January 2026**.

### Audit Findings (All Remediated)
| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| HR-01 | High | NFT Cache Poisoning | ✅ Fixed (HMAC signing) |
| HR-02 | High | DoS via Session Flooding | ✅ Fixed (Session limits) |
| MR-01 | Medium | Plaintext Credential Storage | ✅ Fixed (OS Keychain) |
| LR-01 | Low | Local LLM Prompt Injection | ✅ Fixed (Strict delimiters) |

**Auditor**: Redacted Security Firm  
**Report Date**: January 20, 2026  
**Status**: PASS

## Reporting a Vulnerability
**DO NOT** open a public GitHub issue for security vulnerabilities.

### Responsible Disclosure Process
1. **Email**: security@think.ai
2. **PGP Key**: [Available at keybase.io/think](https://keybase.io/think)
3. **Response Time**: We commit to acknowledging within 48 hours
4. **Bounty**: Security researchers may be eligible for rewards (up to $5,000)

### What to Include
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested mitigation (if applicable)

## Security Best Practices for Developers
If you're integrating TAIS into your app:
1. ✅ **Never** expose `user_profile.json` via HTTP endpoints
2. ✅ **Always** validate profiles using `UserProfileSchema.parse()`
3. ✅ **Never** store API keys in plaintext (use `CredentialManager`)
4. ✅ **Always** set `DEV_MODE=false` in production
5. ✅ **Never** trust client-provided NFT verification (always verify on backend)

## Known Limitations
- **Local LLMs**: Requires models that follow strict instruction formatting (e.g., `llama3:instruct`)
- **NFT Verification**: Relies on RPC endpoint availability (15-minute cache mitigates)
- **File Permissions**: Unix `chmod 0o600` not supported on Windows (OS ACLs used instead)

## Security Contact
- **Email**: security@think.ai
- **Discord**: Moderators in `#security` channel
- **Bug Bounty**: https://think.ai/security/bounty

Last Updated: January 23, 2026
