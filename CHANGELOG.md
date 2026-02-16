# TAIS Platform Changelog

All notable changes to the TAIS Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Conversational interview experience (v2.5)
- Configuration templates gallery
- Version history for configurations
- $THINK token integration (migrating from Genesis NFT)
- Tier system (Free/Bronze/Silver/Gold)
- Multi-device sync with Supabase

## [2.0.1] - 2026-02-15

### Added
- **Side-by-Side Configuration View**: JSON and Natural Language views displayed simultaneously in ConfigPreview
- **Natural Language Summary Generation**: Human-readable descriptions of agent configurations
- **Configuration Summary Library** (`config-summary.ts`): Generates conversational summaries from JSON
- **Privacy-Enhanced Config Design**: Wallet address separated from configuration data for anonymity
- **My Agents Dashboard Modal**: Click any saved agent to view detailed side-by-side configuration
- **Dashboard Actions**: Export, Copy, Delete actions in agent detail modal

### Changed
- **ConfigPreview Component**: Complete redesign with side-by-side layout instead of vertical stack
- **Dashboard Agent Cards**: Now clickable with "View" button for detailed inspection
- **AgentConfig Type**: Removed `owner` field; wallet info moved to separate `ConfigOwnership` interface
- **Config Schema**: Updated to separate ownership metadata from config data

### Fixed
- **Scrolling in Modal**: Added proper scrollbars to agent detail modal for long configurations
- **Panel Heights**: Fixed height constraints for consistent layout across screen sizes

### Security
- **Privacy Improvement**: Configuration exports no longer contain wallet addresses
- **Anonymous Configs**: Users can share/export configs without exposing identity

## [2.0.0] - 2026-02-15

### Added
- **Production Security Audit**: Comprehensive security assessment (8/8 penetration tests passed)
- **Security Documentation**: `SECURITY_AUDIT_REPORT.md` with full assessment
- **CTO Deployment Review**: `CTO_DEPLOYMENT_REVIEW.md` for stakeholder approval
- **Configuration Persistence**: Save/load agent configurations with JWT authentication
- **Genesis NFT Integration**: Verify NFT ownership for configuration limits
- **Rate Limiting**: 5-tier system (Standard, Strict, Auth, Authenticated, API Key)
- **JWT Authentication**: Wallet-based auth with signature verification
- **Nonce Replay Protection**: Atomic nonce consumption prevents replay attacks

### Security
- **OWASP Top 10 Compliance**: Protection against injection, XSS, CSRF, and more
- **Helmet Security Headers**: CSP, HSTS, XSS protection, referrer policy
- **CORS Configuration**: Strict origin whitelist for production
- **Input Validation**: Zod schemas for all endpoints
- **Error Sanitization**: No sensitive data in error messages

## [1.9.0] - 2026-02-13

### Added
- **Interview Wizard**: Step-by-step agent configuration creation
- **Skills Registry Integration**: Browse and select skills from registry
- **Personality Configuration**: Tone, verbosity, formality settings
- **Autonomy Levels**: confirm/suggest/independent action modes
- **Privacy Settings**: local/balanced/cloud data storage options
- **Real-time Preview**: Live JSON generation during interview

### Features
- **Goal Selection**: Choose from learning, work, research, code-generation, etc.
- **Skill Discovery**: Search and filter available skills
- **Configuration Validation**: Zod schema validation for all configs
- **Export/Download**: Save configurations as JSON files

## [1.8.0] - 2026-02-10

### Added
- **Landing Page**: Marketing page with Genesis NFT integration
- **OpenSea CTA**: Direct link to NFT collection
- **Feature Showcase**: Display holder benefits and tier system
- **Responsive Design**: Mobile-friendly layout

## [1.7.0] - 2026-02-08

### Added
- **Backend API**: Express server with TypeScript
- **Database Schema**: PostgreSQL with Prisma ORM
- **Authentication Service**: JWT token generation and validation
- **NFT Verification**: Multi-RPC fallback for ownership checks
- **Health Monitoring**: `/health` and `/api/metrics` endpoints

### Infrastructure
- **Render Deployment**: Backend deployed to Render.com
- **Vercel Deployment**: Frontend deployed to Vercel
- **Environment Configuration**: Production-ready env vars

## [1.6.0] - 2026-02-05

### Added
- **YARA Scanner**: Malware detection for skill packages
- **IPFS Integration**: Content-addressed storage for skills
- **Audit System**: Security audit submission and verification
- **Admin Dashboard**: Skill moderation and management

## [1.5.0] - 2026-02-01

### Added
- **Skills API**: CRUD operations for skill management
- **Registry Client**: TypeScript client for skill interactions
- **Search Functionality**: Full-text search for skills
- **Category Filtering**: Filter skills by category

## [1.4.0] - 2026-01-28

### Added
- **TypeScript Migration**: Full TypeScript support
- **Testing Framework**: Jest setup (tests pending fixes)
- **Linting**: ESLint and Prettier configuration

## [1.3.0] - 2026-01-25

### Added
- **React Frontend**: Next.js application with Tailwind CSS
- **Component Library**: shadcn/ui components
- **Dark Theme**: Default dark mode UI
- **Animation**: Framer Motion for smooth transitions

## [1.2.0] - 2026-01-20

### Added
- **Monaco Editor**: JSON editor for configuration editing
- **Syntax Highlighting**: Code editing experience
- **Real-time Validation**: Schema validation as you type

## [1.1.0] - 2026-01-15

### Added
- **Web3 Integration**: Ethers.js for blockchain interactions
- **Wallet Connection**: MetaMask integration
- **Contract ABIs**: Support for Genesis NFT contract

## [1.0.0] - 2026-01-10

### Added
- **Initial Release**: Project setup and scaffolding
- **Documentation**: README and basic docs
- **License**: MIT License
- **Repository**: GitHub repository created

---

## Release Notes Template

### Version X.Y.Z - YYYY-MM-DD

#### Added
- New features

#### Changed
- Changes to existing functionality

#### Deprecated
- Soon-to-be removed features

#### Removed
- Removed features

#### Fixed
- Bug fixes

#### Security
- Security improvements

