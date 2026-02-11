# TAIS Skill Registry v1.0 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![Status](https://img.shields.io/badge/Status-Public%20Beta-orange.svg)]()

**Production-Ready • NFT-Verified • Decentralized Storage**

TAIS (Think Agent Interview System) Skill Registry is a secure, scalable API for discovering, publishing, and auditing AI agent skills. Built with Express.js, PostgreSQL, and blockchain verification via THINK Genesis Bundle NFTs.

🌐 **Live API:** https://tso.onrender.com  
📚 **Documentation:** https://tso.onrender.com/api/docs  
🔐 **Status:** Public Beta (Genesis Holders Only)

---

## ✨ Features

### 🔐 Security-First Architecture
- ✅ **NFT Verification** - Publisher/Auditor identity via THINK Genesis Bundle
- ✅ **YARA Scanning** - Automated security analysis of skill packages
- ✅ **Trust Scoring** - Multi-factor reputation system
- ✅ **Rate Limiting** - DDoS protection with tiered access
- ✅ **Admin Controls** - Block malicious skills, override scores

### 📦 Skill Management
- 📝 **Skill Publishing** - Upload skills with metadata and permissions
- 🔍 **Search & Discovery** - Full-text search with filters
- ⭐ **Trust Scores** - Public reputation scores for all skills
- 🏷️ **Categories & Tags** - Organized skill discovery
- 📊 **Analytics** - Download counts, popularity tracking

### 🏗️ Infrastructure
- ⚡ **REST API** - 20+ endpoints with OpenAPI/Swagger docs
- 🗄️ **PostgreSQL** - Relational database with Prisma ORM
- 📦 **IPFS Storage** - Decentralized skill package storage
- 📈 **Monitoring** - Prometheus metrics, health checks
- 🔄 **CI/CD** - Automated testing and deployment

---

## 🚀 Quick Start

### Browse Skills (No Auth Required)
```bash
# List all skills
curl https://tso.onrender.com/api/skills

# Search skills
curl "https://tso.onrender.com/api/search?q=weather"

# Get skill details
curl https://tso.onrender.com/api/skills/{skill_hash}
```

### Publish Skills (Genesis Holders Only)
```bash
# Requires THINK Genesis Bundle NFT
# Header: X-Wallet-Address: 0xYOUR_WALLET

curl -X POST https://tso.onrender.com/api/skills \
  -H "Content-Type: application/json" \
  -H "X-Wallet-Address: 0xYOUR_GENESIS_WALLET" \
  -d '{
    "name": "my-skill",
    "version": "1.0.0",
    "description": "A useful skill",
    "permissions": {
      "network": {"domains": ["api.example.com"]},
      "filesystem": {"read": ["/data"], "write": []}
    }
  }'
```

---

## 📁 Project Structure

```
TSO/
├── packages/
│   ├── registry/          # Main API server (deployed)
│   │   ├── src/
│   │   │   ├── index.ts              # Express app
│   │   │   ├── routes/               # API endpoints
│   │   │   ├── services/             # Business logic
│   │   │   │   ├── nftVerification.ts    # NFT checking
│   │   │   │   ├── yaraScanner.ts        # Security scanning
│   │   │   │   └── ipfs.ts               # IPFS client
│   │   │   └── monitoring/           # Metrics & alerts
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Database schema
│   │   └── render.yaml               # Deployment config
│   ├── core/              # Security services (shared)
│   ├── types/             # TypeScript schemas
│   └── sdk/               # Client SDK
├── tais-frontend/         # Next.js interview system (NEW)
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   │   ├── ui/            # Base UI components
│   │   └── interview/     # Interview wizard
│   ├── lib/               # Utilities & configs
│   └── types/             # TypeScript types
├── demo-skills/           # Example skills
│   ├── weather-api/
│   ├── data-processor/
│   └── crypto-price/
├── frontend.md            # Frontend development guide
└── render.yaml            # Infrastructure as code
```

---

## 🔧 Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Server** | Express.js + TypeScript | REST API endpoints |
| **Database** | PostgreSQL + Prisma | Skill metadata & relations |
| **Storage** | IPFS (Pinata) | Decentralized skill packages |
| **Blockchain** | Ethereum (Mainnet) | NFT verification |
| **Security** | YARA + Custom Rules | Automated code scanning |
| **Monitoring** | Prometheus + Sentry | Metrics & error tracking |
| **Hosting** | Render (Free Tier) | Production deployment |
| **Frontend** | Next.js 14 + Tailwind | Interview wizard & agent builder |
| **State Management** | Zustand | Interview progress & config |
| **Animations** | Framer Motion | UI transitions |

---

## 🎨 Frontend (Interview System)

TAIS includes a **configuration-first interview system** that guides users through creating custom AI agents:

**How It Works:**
1. **Structured Interview** (7-8 steps) - Answer questions about goals, skills, behavior
2. **Configuration Generation** - System creates JSON agent configuration
3. **Skill Selection** - Browse and select from verified registry skills
4. **Deployment** - Launch as Web, Desktop, or API agent

**Current Status:** 🚧 **In Development** (90% Complete)
- ✅ Interview wizard with 8 steps
- ✅ THINK design system (dark theme)
- ✅ Zustand state management with persistence
- ✅ **Skills integration with live registry API**
- ✅ Trust score visualization (color-coded badges)
- ✅ **MetaMask wallet connection** (ethers.js v6)
- 🚧 Monaco Editor for JSON preview
- 🚧 Deployment pipeline

**Frontend Stack:**
- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS with THINK design system
- **State:** Zustand for interview progress
- **Animations:** Framer Motion for smooth transitions
- **Editor:** Monaco Editor for JSON preview
- **Web3:** Ethers.js for wallet integration

**Key Features:**
- 🎯 **Goal-Oriented** - Interview discovers user intent
- 🧩 **Skill Browser** - Select from registry with trust scores
- 🎨 **Visual Config** - Real-time JSON preview
- 🚀 **One-Click Deploy** - Web, Desktop, or API
- 🌓 **Dark/Light Mode** - THINK brand design system

**Status:** 🚧 **In Development** - See `frontend.md` for detailed specs

**Location:** `tais-frontend/` directory

## 🛠️ Development

### Prerequisites
- Node.js v20+
- PostgreSQL 14+
- THINK Genesis Bundle NFT (for publishing)

### Local Setup
```bash
# Clone repository
git clone https://github.com/adamberneche-afk/TSO.git
cd TSO/packages/registry

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL, IPFS keys, etc.

# Run migrations
npx prisma migrate deploy

# Seed demo data
npx prisma db seed

# Start development server
npm run dev
```

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key

# IPFS (Pinata)
IPFS_PROJECT_ID=your-project-id
IPFS_PROJECT_SECRET=your-secret

# NFT Verification
PUBLISHER_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
AUDITOR_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
RPC_URL=https://cloudflare-eth.com

# Admin
ADMIN_WALLET_ADDRESSES=0x...
```

---

## 📊 API Endpoints

### Public Endpoints (No Auth)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/skills` | GET | List all skills |
| `/api/skills/:hash` | GET | Get skill details |
| `/api/search` | GET | Search skills |
| `/api/search/trending` | GET | Trending skills |
| `/api/docs` | GET | Swagger UI |

### Protected Endpoints (NFT Required)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/skills` | POST | Publish new skill |
| `/api/audits` | POST | Submit audit |
| `/api/audits` | GET | List audits |

### Admin Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/stats` | GET | System statistics |
| `/api/admin/skills/:id/block` | POST | Block skill |
| `/api/admin/skills/blocked` | GET | List blocked |

**Full API documentation:** https://tso.onrender.com/api/docs

---

## 🧪 Beta Program

**Status:** 🟢 Public Beta  
**Access:** THINK Genesis Bundle holders  
**Duration:** 1 month (February 2026)  

### Beta Limits
- **File Size:** 1MB per skill package
- **Uploads:** 10 per wallet per day
- **Rate Limit:** 200 requests per 15 minutes

### Feedback
- 🐛 **Bugs:** [GitHub Issues](https://github.com/adamberneche-afk/TSO/issues)
- 💬 **Discord:** THINK Discord server

---

## 🔐 Security

### Verification Layers
1. **NFT Verification** - Must hold THINK Genesis Bundle
2. **YARA Scanning** - Automated security analysis
3. **Admin Review** - Human oversight for flagged content
4. **Trust Scoring** - Community-driven reputation

### Audit Trail
- All skill uploads logged with wallet address
- Audit submissions cryptographically signed
- Block actions recorded with admin wallet & reason

---

## 📈 Roadmap

### Phase 1 ✅ Complete
- [x] Express.js API server
- [x] PostgreSQL database
- [x] IPFS integration
- [x] Basic CRUD operations

### Phase 2 ✅ Complete
- [x] Admin controls
- [x] Authentication system
- [x] Rate limiting
- [x] Monitoring & alerts

### Phase 3 ✅ Complete
- [x] NFT verification (THINK Genesis Bundle)
- [x] YARA security scanning
- [x] Trust scoring system
- [x] Production deployment

### Phase 4 🚧 In Progress
- [ ] Public beta testing
- [ ] Community feedback integration
- [ ] Performance optimization
- [ ] Analytics dashboard

### Phase 5 ⏳ Planned
- [ ] Custom Publisher NFT contract
- [ ] $THINK token staking
- [ ] Fiat on-ramp (Stripe)
- [ ] General availability launch

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/adamberneche-afk/TSO/issues)
- **Discord:** THINK Protocol Discord
- **Documentation:** https://tso.onrender.com/api/docs

---

## 🙏 Acknowledgments

- **THINK Protocol** - For the Genesis Bundle NFT collection
- **Render** - Free tier hosting
- **Pinata** - IPFS infrastructure
- **Cloudflare** - Ethereum RPC endpoint

---

**Built with ❤️ by the TAIS Team**  
**© 2026 - Production Ready**
