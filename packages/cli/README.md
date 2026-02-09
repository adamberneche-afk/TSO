# TAIS CLI Tool - Beta

## Overview

The TAIS CLI tool provides command-line access to the TAIS Skill Security System for installing and managing secure agent skills.

## Installation

```bash
# From source (current development state)
cd packages/cli
npm install
npm run build
npm link

# Future: From npm
npm install -g @think/cli
```

## Commands

### `tais install <skill>`

Install a skill with comprehensive security checks.

```bash
# Install from local directory
tais install ./my-skill

# Install with force flag (skip warnings)
tais install ./my-skill --force

# Install without confirmation prompts
tais install ./my-skill --yes
```

**Security Features:**
- ✅ Manifest validation and schema verification
- ✅ Permission risk analysis (low/medium/high/critical)
- ✅ Suspicious domain detection (webhook.site, pastebin.com, etc.)
- ✅ Sensitive file access warnings (.env, private keys, etc.)
- ✅ Community malicious status checking
- ✅ Trust score calculation
- ✅ Interactive user confirmation

### `tais list`

List all installed skills with security information.

```bash
# Basic list
tais list

# Detailed information
tais list --verbose

# Risk assessment only
tais list --risk
```

### `tais audit <skill>`

Submit security audit for a skill.

```bash
# Basic audit
tais audit my-skill

# Submit YARA report
tais audit my-skill --report yara-findings.json

# Mark as suspicious/malicious
tais audit my-skill --status malicious
```

### `tais verify <target>`

Verify skill security or author identity.

```bash
# Verify skill integrity
tais verify abc123...

# Verify author NFT ownership
tais verify 0x742d... --author

# Verify full provenance chain
tais verify abc123... --provenance
```

### `tais remove <skill>`

Remove an installed skill with cleanup.

```bash
# Remove with confirmation
tais remove my-skill

# Remove without confirmation
tais remove my-skill --yes
```

### `tais config`

Manage CLI configuration.

```bash
# List all configuration
tais config --list

# Set configuration value
tais config --set rpc_url=https://mainnet.infura.io/v3/YOUR_KEY

# Get configuration value
tais config --get rpc_url
```

## Example Skill Structure

Skills must follow this structure:

```
my-skill/
├── manifest.json    # Skill metadata and permissions
├── index.js         # Main skill code
└── README.md        # Documentation
```

### Example `manifest.json`

```json
{
  "name": "weather-api",
  "version": "1.0.0",
  "description": "Get weather data from OpenWeatherMap",
  "author": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "skill_hash": "abc123...",
  "permissions": {
    "network": {
      "domains": ["api.openweathermap.org"],
      "allowed_methods": ["GET"]
    },
    "env_vars": ["WEATHER_API_KEY"],
    "modules": ["axios", "crypto"],
    "filesystem": {
      "read": ["./cache/*.json"],
      "write": ["./logs/*.log"]
    }
  },
  "provenance": {
    "author_signature": "0x...",
    "auditors": [
      {
        "wallet": "0x...",
        "role": "auditor",
        "timestamp": "2026-02-04T...",
        "signature": "0x...",
        "metadata": {
          "audit_report_url": "https://audit.example.com/weather-api"
        }
      }
    ],
    "isnad_chain": ["0x742d...", "0x8f3a..."],
    "trust_score": 0.85
  },
  "created_at": "2026-02-04T...",
  "updated_at": "2026-02-04T..."
}
```

## Security Features

### 🔍 **Permission Analysis**

The CLI automatically analyzes skill permissions and categorizes risk levels:

- **Low**: Basic functionality with minimal permissions
- **Medium**: Access to some external resources
- **High**: Broad permissions or external network access
- **Critical**: Suspicious domains or dangerous permissions

### 🚨 **Red Flag Detection**

Automatic detection of suspicious patterns:

- Suspicious domains: `webhook.site`, `pastebin.com`, `gist.github.com`
- Sensitive file access: `.env`, private keys, config files
- Broad permissions: wildcards, root access
- Network exfiltration patterns

### 🛡️ **Community Protection**

Integration with the TAIS security ecosystem:

- Malicious skill blocking from community reports
- Trust score calculation from NFT verification
- Provenance chain validation
- Auditor NFT verification

### 🔐 **Installation Safety**

- User confirmation before installation
- Detailed permission review
- Trust score display
- Risk level assessment

## Development Status

### ✅ **Completed Features**

- CLI package structure with Commander.js
- Install command with full security analysis
- Risk assessment engine
- Interactive permission review
- Help system and command structure
- TypeScript compilation

### 🚧 **In Progress**

- Audit command implementation
- List/remove commands
- Configuration management
- Integration with core services

### ❌ **Not Yet Implemented**

- Real integration with SkillAdapter (currently mocked)
- Live blockchain verification
- YARA scan integration
- Registry server connection

## Usage Examples

### Installing a Safe Skill

```bash
$ tais install ./weather-skill

🔍 TAIS Skill Security Installer
══════════════════════════════════════════════════
⠋ Loading skill manifest...
✅ Skill manifest loaded
⠋ Analyzing security...
✅ Security analysis complete

📋 Skill Information:
   Name: weather-api
   Version: 1.0.0
   Author: 0x742d...
   Hash: abc123...

🛡️  Security Assessment:
   Risk Level: LOW

📄 Requested Permissions:
   🌐 Network: api.openweathermap.org
   🔧 Env Vars: WEATHER_API_KEY
   📦 Modules: axios
──────────────────────────────────────────────────
⠋ Checking community safety...
✅ Skill is safe according to community
⠋ Verifying trust score...
✅ Trust score: 85.0%

Install this skill? (y/N): y

⠋ Installing skill...
✅ Skill installed successfully
🎯 weather-api v1.0.0 is now ready to use.

✅ Installation Summary:
   📍 Location: ./weather-skill
   🛡️  Trust Score: 85.0%
   🔗 Installed Skills: tais list
   🔍 Verify Security: tais verify abc123...
══════════════════════════════════════════════════
```

### Blocking a Malicious Skill

```bash
$ tais install ./stealer-skill

🔍 TAIS Skill Security Installer
══════════════════════════════════════════════════
⠋ Loading skill manifest...
✅ Skill manifest loaded
⠋ Analyzing security...
✅ Security analysis complete

📋 Skill Information:
   Name: config-reader
   Version: 1.0.0
   Author: 0xmalicious...

🛡️  Security Assessment:
   Risk Level: CRITICAL

⚠️  Warnings:
   ⚠️  Suspicious domain: webhook.site
   ⚠️  Sensitive file access: .env
   ⚠️  Sensitive file access: private.key
──────────────────────────────────────────────────
⠋ Checking community safety...
❌ SKILL BLOCKED BY COMMUNITY
This skill has been flagged as malicious by community.
```

## Next Steps

1. **Core Service Integration** - Connect CLI to actual TAIS services
2. **Registry Server** - Add remote skill installation
3. **YARA Integration** - Real malware scanning
4. **Live Blockchain** - NFT verification on mainnet/testnet
5. **Community Features** - Audit submission and verification

The CLI provides the user interface for the complete TAIS security ecosystem, making secure skill installation accessible from the command line.