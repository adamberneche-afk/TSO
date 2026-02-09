# THINK Agent Interview System (TAIS) v1.6

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-25+-green.svg)](https://www.electronjs.org/)

**Production-Ready • Security-Audited • Local-First**

TAIS is a privacy-preserving user profiling system for the ThinkOS ecosystem. Complete a single 3-minute AI-powered interview to generate a standardized JSON profile that auto-configures every app in the THINK Marketplace.

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0+ (LTS recommended)
- **npm**: v9.0+
- **Genesis NFT**: Required for profile creation

### Installation
```bash
# Clone the repository
git clone https://github.com/think-protocol/tais.git
cd tais

# Install dependencies (monorepo)
npm install

# Build all packages
npm run build

# Run the integration example
npm run dev
```

## 📦 Monorepo Structure
```
tais-repository/
├── packages/
│   ├── types/          # Shared TypeScript types & Zod schemas
│   ├── core/           # Backend logic (Electron Main Process)
│   └── sdk/            # Public SDK for Marketplace apps
└── integration-example/ # Demo Electron app
```

## 🔐 Security Features (v1.6 Audit Compliance)
✅ NFT Cache Poisoning Prevention: HMAC-SHA256 signed cache entries
✅ DoS Protection: Max 10 concurrent sessions
✅ Encrypted Credentials: OS Keychain storage (no plaintext)
✅ Input Validation: Strict Zod schemas on all data
✅ Local-First: Zero cloud database, data stays on device

**Audit Status**: PASS (January 2026)

## 🧠 AI Provider Support
| Provider | Mode | Privacy | Speed |
|-----------|------|---------|-------|
| **Anthropic Claude 3** | Cloud | Standard API | ⚡⚡⚡ Fast |
| **BYOK (Claude)** | Cloud | User-controlled key | ⚡⚡⚡ Fast |
| **Local LLMs** | Offline | 100% Private | ⚡⚡ Medium |

Supported Local Models: Ollama, LM Studio (OpenAI-compatible)

## 📖 Documentation
- Whitepaper: Technical architecture & design principles
- User Guide: End-user onboarding instructions
- PRD: Product requirements & success metrics
- Technical Spec: Implementation details
- Security: Audit findings & mitigations

## 🛠️ Development

### Environment Variables
Create a `.env` file in the root:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Optional
DEV_MODE=true  # Enables mock profile bypass
```

### Scripts
```bash
npm run build       # Build all packages
npm run dev         # Run integration example
npm test            # Run test suite (if implemented)
```

## 📄 License
This project is licensed under CC BY-SA 4.0.

© 2026 THINK Protocol. All rights reserved.

## 🤝 Contributing
We welcome contributions! Please see CONTRIBUTING.md for guidelines.

## 📞 Support
- Discord: discord.gg/think
- Docs: docs.think.ai
- Email: support@think.ai
