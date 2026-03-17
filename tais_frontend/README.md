# TAIS Platform

**Think Agent Interview System** - An interview-driven AI agent builder that generates executable configuration files through a simple Q&A process.

## 🎯 Overview

TAIS allows anyone to create custom AI agents without coding. Just answer 7 simple questions and get a production-ready agent configuration that can be deployed anywhere.

## ✨ Features

- **Interview-Driven Configuration** - 7-step wizard guides you through setup
- **Skill Registry Integration** - Browse and select verified skills with trust scores
- **Behavior Customization** - Fine-tune communication style, autonomy, and personality
- **Blockchain Ownership** - Connect wallet to own agents as NFTs
- **Privacy Controls** - Set boundaries for data processing and permissions
- **JSON Export** - Download clean, executable configuration files
- **Monaco Editor** - Preview and edit configurations with syntax highlighting

## 🏗️ Architecture

```
Interview Wizard → JSON Configuration → Deployed Agent
     (7 steps)         (Validated)        (Multiple options)
```

### Interview Steps

1. **Welcome & Goals** - Define what your agent will help with
2. **Skill Selection** - Choose capabilities from the registry
3. **Behavior Configuration** - Set communication and autonomy preferences
4. **Privacy & Constraints** - Define security boundaries and budgets
5. **Identity & Naming** - Name your agent and optionally connect wallet
6. **Review Configuration** - Preview and edit the generated JSON
7. **Deployment** - Choose how to deploy your agent

## 🎨 Design System

### Colors
- **Background:** `#000000` (Pure black)
- **Surface:** `#111111` / `#1a1a1a`
- **Accent:** `#3B82F6` (Electric blue)
- **Text:** `#FFFFFF` / `#888888` / `#555555`
- **Success:** `#10B981`
- **Error:** `#EF4444`

### Typography
- **Headlines:** Fira Sans Extra Condensed (500 weight)
- **Body:** Inter (400/500/700)
- **Code:** JetBrains Mono (400)

### Spacing
- Base unit: 4px
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px, 3xl: 64px

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MetaMask (optional, for blockchain features)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file:

```bash
VITE_REGISTRY_URL=https://tso.onrender.com
VITE_GENESIS_CONTRACT=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
```

## 📦 Tech Stack

- **Framework:** React 18
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand
- **Validation:** Zod
- **Editor:** Monaco Editor
- **Blockchain:** Ethers.js v6
- **UI Components:** Radix UI
- **Icons:** Lucide React

## 🔌 API Integration

### Registry API

The platform connects to the TAIS Registry at `https://tso.onrender.com/api/v1`:

- `GET /api/v1/skills` - List available skills
- `GET /api/v1/skills/:hash` - Get skill details
- `POST /api/v1/skills` - Publish new skill (requires Genesis NFT)
- `GET /api/v1/search` - Search skills
- `GET /api/v1/search/trending` - Get trending skills

### Wallet Integration

- **MetaMask** connection for blockchain features
- **Genesis NFT** verification (contract: `0x11B3EfbF04F0bA505F380aC20444B6952970AdA6`)
- Optional wallet connection for agent ownership

## 📋 Configuration Schema

Generated agent configurations follow this structure:

```json
{
  "agent": {
    "name": "string",
    "version": "1.0.0",
    "description": "string",
    "goals": ["string"],
    "skills": [
      {
        "id": "string",
        "source": "registry",
        "version": "string",
        "hash": "string",
        "permissions": ["string"],
        "trustScore": 0.95
      }
    ],
    "personality": {
      "tone": "balanced",
      "verbosity": "balanced",
      "formality": "professional"
    },
    "autonomy": {
      "level": "suggest"
    },
    "constraints": {
      "privacy": "balanced",
      "maxCostPerAction": 0.1,
      "blockedModules": ["child_process"],
      "maxFileSize": 1048576
    },
    "owner": {
      "walletAddress": "0x..."
    },
    "createdAt": "2026-02-10T00:00:00.000Z"
  }
}
```

## 🛠️ Development

### Project Structure

```
src/
├── app/
│   ├── App.tsx                    # Main application
│   └── components/
│       ├── LandingPage.tsx        # Landing page
│       ├── interview/             # Interview wizard
│       │   ├── InterviewWizard.tsx
│       │   ├── WelcomeStep.tsx
│       │   ├── SkillSelector.tsx
│       │   ├── BehaviorStep.tsx
│       │   ├── PrivacyStep.tsx
│       │   ├── IdentityStep.tsx
│       │   ├── ConfigPreview.tsx
│       │   ├── ProgressBar.tsx
│       │   └── Navigation.tsx
│       └── ui/                    # Reusable UI components
├── hooks/
│   ├── useInterview.ts            # Interview state management
│   └── useWallet.ts               # Wallet connection
├── lib/
│   ├── config-schema.ts           # Configuration validation
│   ├── interview-config.ts        # Config generation
│   └── registry-client.ts         # API client
├── types/
│   ├── agent.ts                   # Agent types
│   └── registry.ts                # Registry types
└── styles/
    ├── fonts.css                  # Font imports
    ├── theme.css                  # Design system
    └── index.css                  # Main styles
```

### Key Components

- **InterviewWizard** - Main interview flow coordinator
- **SkillSelector** - Browse and select skills from registry
- **ConfigPreview** - JSON editor with Monaco
- **useInterview** - Zustand store for interview state
- **useWallet** - MetaMask wallet integration
- **registryClient** - API client for skill registry

## 🔐 Security

- **Local-first privacy** option keeps all data on device
- **Permission system** for controlling agent capabilities
- **Budget limits** to prevent excessive API costs
- **Sandboxed execution** for code-running skills
- **Trust scores** for skill verification

## 🎯 Roadmap

- [x] Interview wizard
- [x] Skill registry integration
- [x] Configuration generation
- [x] Wallet integration
- [ ] Web agent deployment
- [ ] Desktop app download
- [ ] API endpoint generation
- [ ] Agent marketplace
- [ ] Skill publishing flow

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

---

**Built with ❤️ for the TAIS Platform**
