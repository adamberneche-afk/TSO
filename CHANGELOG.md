# TAIS Platform Changelog

All notable changes to the TAIS Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- **Configuration Versioning** - R2 storage + tiered retention
- Multi-device sync with Supabase
- Enterprise RAG with SSO integration

## [2.7.6] - 2026-02-23

### Added
- **CTO Agent** - Full app development partner
  - Project-based tracking through 5 phases: planning → architecture → development → testing → launch
  - Pain points by area (security, database, API, etc.)
  - Blockers with resolution tracking
  - Analytics integration for weekly insights
  - Gold tier authentication required
  - API: `/api/v1/cto/*`

## [2.7.5] - 2026-02-23

### Added
- **Guided Discovery** - Interview-driven agent creation (replaces templates)
  - 15-question progressive flow covering function, audience, differentiation, communication, knowledge
  - Generates Personality Markdown + System Prompt + Config JSON
  - API: `/api/v1/guided-discovery/*`
  - Preserves human agency through forced customization

- **SDK Assistant CLI** (`packages/sdk-assistant`)
  - Interactive CLI onboarding for developers
  - Commands: `init`, `start`, `test`, `status`, `config`, `analytics`
  - Tracked analytics: session completion, errors, features, timing
  - Gold tier (Genesis NFT) required

- **Analytics Infrastructure**
  - `SDKAnalyticsEvent` - Track integration events
  - `CTOAgentProject` - Track CTO agent usage
  - `WeeklyInsightsReport` - Generated reports storage
  - API: `/api/v1/analytics/*`

- **Weekly Insights Email**
  - Automated weekly reports to taisplatform@gmail.com
  - GitHub Actions cron (free, no Render payment)
  - `.github/workflows/weekly-insights.yml`
  - Triggers every Monday at 9am UTC

### Database
- Added models: `GuidedDiscoverySession`, `SDKAnalyticsEvent`, `CTOAgentProject`, `WeeklyInsightsReport`

## [2.7.4] - 2026-02-23

### Added
- **RAG Session-Based Authentication** - Streamlined uploads
  - `POST /api/v1/rag/session/start` - Start 1-hour session with wallet signature
  - `GET /api/v1/rag/session/status` - Check session status
  - `DELETE /api/v1/rag/session/end` - End session
  - Upload unlimited documents during session (no per-doc signature)
  - Session tracked with activity, document count, bytes uploaded
  - Max 3 concurrent sessions per wallet

- **SDK Session Support** - `tais-rag-sdk@1.1.0`
  - `client.startRAGSession(signFn)` - Start session
  - `client.getSessionStatus()` - Check session
  - `client.endRAGSession()` - End session
  - Automatic session token in upload requests

### Changed
- RAG routes now support session-based auth via `X-Session-Token` header
- Upload response includes `sessionRemaining` seconds when using session

## [2.7.3] - 2026-02-23

### Added
- **App RAG SDK** (`tais-rag-sdk`) - Published to npm for third-party developers
  - `npm install tais-rag-sdk`
  - `TAISClient` class for API communication
  - Document upload, search, delete, share methods
  - Quota and stats endpoints
  - Community document browsing
  - E2EE crypto utilities (AES-256-GCM, ECDH P-384)
  - Text chunking with overlap support
  - Embedding hash generation for privacy-preserving search

- **SDK Wallet Signature Authentication** - Gold tier required
  - `GET /api/v1/sdk/auth/challenge` - Get challenge message to sign
  - `POST /api/v1/sdk/auth/authenticate` - Submit signature, receive API key
  - `GET /api/v1/sdk/auth/verify` - Verify API key validity
  - `DELETE /api/v1/sdk/auth/revoke` - Revoke API key
  - Genesis NFT verification for Gold tier access
  - 30-day API key expiry, 10K requests/day limit

### Files Added
- `packages/rag-sdk/` - New SDK package
  - `src/index.ts` - Main client and types
  - `src/crypto.ts` - Encryption utilities
  - `README.md` - SDK documentation
  - `examples/basic.ts` - Usage example
- `packages/registry/src/routes/sdkAuth.ts` - SDK authentication routes

## [2.7.2] - 2026-02-23

### Added
- **Sprint 3 Complete: Monitoring & Observability**
  - SendGrid email alerts verified working
  - Performance baseline established via load testing
  - Load test script (`tests/load-test.js`) for ongoing testing

### Changed
- **Redis Service**: Created mock redis.ts for module compatibility

### Performance Baseline
| Metric | Value | Target | Notes |
|--------|-------|--------|-------|
| Error Rate | 0.00% | < 5% | ✅ Pass |
| p50 Latency | 295ms | < 200ms | ⚠️ Render cold start |
| p95 Latency | 1829ms | < 500ms | ⚠️ Render free tier |
| p99 Latency | 2070ms | < 1000ms | ⚠️ Render free tier |

## [2.7.1] - 2026-02-20

### Added
- **Monitoring & Observability System** - Sprint 3
  - **Prometheus Metrics Endpoint** - `/monitoring/metrics`
  - **Dashboard Endpoint** - `/monitoring/dashboard`
  - **Metrics Middleware** - Tracks all API requests automatically
  
- **TAIS-Specific Metrics**
  - `tais_http_request_duration_seconds` - Request latency (p50, p95, p99)
  - `tais_http_requests_total` - Request counts by endpoint
  - `tais_nft_verifications_total` - NFT verification success/failure by tier
  - `tais_config_saves_total` - Configuration saves
  - `tais_config_updates_total` - Configuration updates
  - `tais_rag_uploads_total` - RAG document uploads by type/tier
  - `tais_rag_queries_total` - RAG search queries
  - `tais_rag_query_duration_seconds` - RAG query latency
  - `tais_rate_limit_hits_total` - Rate limit hits by tier/endpoint
  - `tais_wallet_authentications_total` - Wallet authentication stats
  - `tais_active_wallets` - Unique active wallets gauge

- **Frontend MonitoringDashboard Component**
  - Real-time system health status
  - Memory, CPU, and database metrics
  - Active alerts display
  - Auto-refresh every 30 seconds
  - Link to Prometheus metrics endpoint

- **AlertManager** - Alert evaluation and notification framework
  - Pre-configured alert rules (high error rate, latency, memory, etc.)
  - Cooldown periods to prevent alert spam
  - Multiple notification channels (email, Slack, PagerDuty, webhook)

### Changed
- Fixed `prom-client` import for ESM compatibility (`import * as promClient`)
- Fixed `winston` import for ESM compatibility

## [2.7.0] - 2026-02-20

### Added
- **Hybrid JSON + Markdown Configuration System** - Flexible personality configuration
  - **JSON Framework**: Rigid, validated, type-safe (permissions, quotas, skills, constraints)
  - **Markdown Personality**: Flexible, LLM-friendly, human-readable (prompts, examples, communication style)
  - **Dual-Mode Editing**: Quick sliders OR advanced markdown editor
  - **AI-Assisted Generation**: LLM generates personality markdown from slider values

- **PersonalityEditor Component** - Monaco-based markdown editor
  - Real-time validation with tier-based size limits
  - Markdown preview tab with HTML rendering
  - Token count estimation
  - Dangerous pattern detection (script tags, javascript:, etc.)

- **PersonalityStep Component** - New interview wizard step
  - Toggle between sliders and markdown modes
  - AI-assisted personality generation button
  - Automatic markdown generation from slider values

- **Personality Compiler Service** - Runtime markdown processing
  - Extracts sections from markdown (# headers)
  - Generates optimized system prompts
  - Token count estimation for LLM context

- **Personality Validator Service** - Security and limits
  - Tier-based size limits: Free (5KB), Bronze (10KB), Silver (20KB), Gold (50KB)
  - DOMPurify sanitization for XSS prevention
  - Pattern-based dangerous content detection

- **Personality Versioning** - Cache invalidation system
  - Auto-increment `personalityVersion` on personality changes
  - Version string format: `v{number}-{timestamp}`
  - Backend API support for version tracking

- **E2E Test Suite** - 18 tests for hybrid config
  - Validator tests (6 tests)
  - Compiler tests (4 tests)
  - Generator tests (2 tests)
  - HTML conversion tests (2 tests)
  - Tier limit tests (4 tests)

### Changed
- **Interview Wizard**: Increased from 8 to 9 steps (added Personality step after Knowledge)
- **Agent Config Schema**: Added `personalityMd` and `personalityVersion` fields
- **Backend API**: Updated configuration routes to accept and store personality markdown
- **DOMPurify**: Switched to `isomorphic-dompurify` for Node.js/browser compatibility

### Fixed
- **DOMPurify in Node.js**: Changed import to isomorphic-dompurify for test environment

### Technical
- **Prisma Migration**: `20260220000000_add_personality_fields`
- **New Dependencies**: `marked`, `isomorphic-dompurify`, `@types/dompurify`
- **New Files**:
  - `tais_frontend/src/services/personalityCompiler.ts`
  - `tais_frontend/src/services/personalityValidator.ts`
  - `tais_frontend/src/app/components/interview/PersonalityEditor.tsx`
  - `tais_frontend/src/app/components/interview/PersonalityStep.tsx`
  - `tests/e2e-hybrid-config.ts`

## [2.6.0] - 2026-02-20

### Added
- **ThinkAgents/Obsidian Dark Design System** - Comprehensive dark theme overhaul
  - **Color Palette**: #0A0A0B background, #141415 cards, #262626 borders
  - **Typography**: Inter/Geist Sans, uppercase tracking-widest labels
  - **Button Styles**: White primary, outlined secondary with hover effects
  - **Components**: All conversation, RAG, and interview components updated
  
- **Google Gemini LLM Provider** - New AI provider option
  - Models: gemini-1.5-pro, gemini-1.5-flash, gemini-pro
  - Competitive pricing: $0.25/1M input tokens
  - Proper Gemini API message format conversion
  - System instruction support
  
- **RAG-Agent Configuration Integration** - Knowledge sources in agent configs
  - **KnowledgeConfig Schema**: Sources array with type, documentId, priority
  - **KnowledgeStep Component**: Select documents during agent creation
  - **Document Selection**: My Docs and Community tabs
  - **Priority System**: P1-P10 ranking for knowledge sources
  - **Retrieval Settings**: topK, similarity threshold, citation style
  
- **My Agents Edit Mode** - Post-creation configuration editing
  - **Edit Button**: Toggle edit mode in agent detail modal
  - **Monaco Editor**: Writable JSON editor when editing
  - **Knowledge Sources Panel**: View, add, remove, prioritize sources
  - **Save/Cancel**: Backend persistence with optimistic updates
  
- **Conversational Goals Step** - AI-powered goal discovery
  - **LLM Integration**: Dynamic conversation about goals
  - **Entity Extraction**: Real-time skill/technology detection
  - **Pattern Fallback**: Works without LLM configured
  - **Auto-Advance**: Moves to next step after conversation complete

- **Genesis NFT Gold Tier** - Premium RAG access for holders
  - Automatic gold tier detection via NFT ownership
  - 100GB storage, 2M embeddings/month
  - 100K queries/day, unlimited app connections

- **Multi-Backend YARA Scanner** - Cross-platform security scanning
  - **Native YARA** (Linux/Mac when @automattic/yara available)
  - **YARA CLI** (cross-platform when yara binary installed)
  - **Enhanced Pattern Scanner** (always available, no dependencies)
  - **7 Threat Categories**: Credential theft, exfiltration, injection, network, obfuscation, imports, crypto mining
  - **30+ Detection Patterns**: AWS keys, webhook.site, child_process, eval(atob), hex strings

### Changed
- **Interview Wizard**: Increased from 7 to 8 steps (added Knowledge step)
- **RAG Authentication**: Changed from X-API-Key header to wallet query params
- **TensorFlow.js**: Added WebGL backend with CPU fallback
- **Default Tier**: New users now get bronze tier (was free with 0 quota)

### Fixed
- **Jest Test Suite**: All 10 tests passing (was failing for 6 weeks)
  - Fixed moduleNameMapper typo, import paths, simplified tests
- **TensorFlow.js Backend**: Initialize WebGL before loading USE model
- **RAG API Auth**: Use wallet query params matching backend expectations
- **Badge Import**: Added missing Badge import to ConversationContainer
- **Document Fields**: Handle null/undefined tags and walletAddress in RAG docs
- **Deploy Workflow**: Fixed path from `tais-frontend` to `tais_frontend`
- **LLM Fallback**: Graceful fallback when LLM fails (e.g., CORS for local Ollama)
- **Import Paths**: Removed .js extensions from TypeScript imports

### Testing
- **E2E Test Suite**: 21/21 tests passed
  - Backend health check verified
  - Frontend accessibility confirmed
  - All API endpoints tested (skills, RAG, configurations)
  - CORS configuration validated
  - Authentication enforcement verified
  - RAG document storage/retrieval tested
  - Test report: `docs/E2E_TEST_REPORT.md`
- **Jest Unit Tests**: 10/10 tests passing

## [2.4.0] - 2026-02-18

### Added
- **Public RAG (E2EE Platform)** - Community knowledge sharing with end-to-end encryption
  - **E2EE Encryption Service** (`e2eeEncryption.ts`):
    - AES-256-GCM encryption with wallet-derived keys
    - Public/private key pair generation from wallet signature
    - Hybrid encryption for sharing (RSA-like with XOR for demo)
    - Client-side encryption before upload
    - Local key storage in encrypted form
    
  - **Public RAG API Client** (`publicRAGClient.ts`):
    - Wallet-authenticated API access
    - Encrypted document upload with chunking
    - Privacy-preserving search (embedding hashes only)
    - Client-side decryption of results
    - Document sharing with public keys
    - Community document discovery
    
  - **Public RAG React Hooks** (`usePublicRAG.ts`):
    - `usePublicRAG` - Search, load documents, manage state
    - `usePublicRAGUpload` - Upload with progress tracking
    - Zustand store with persistence
    
  - **Public RAG UI** (`PublicRAGManager.tsx`):
    - Tabbed interface (Upload, Search, My Docs, Community)
    - Document upload with public/private toggle
    - Search with client-side decryption
    - Document sharing with public key input
    - Community document browser
    - Public key display and copying
    
  - **Security Features**:
    - Documents encrypted client-side before upload
    - Only embedding hashes stored on server (not actual embeddings)
    - Server never sees plaintext content
    - Zero-knowledge search architecture
    - Public key cryptography for sharing

## [2.3.0] - 2026-02-18

### Added
- **Multi-RAG System**: Four-tier retrieval-augmented generation architecture
  - **Private RAG** - Local-only knowledge base (IndexedDB, 100% private) ✅
  - **Public RAG** - E2EE community knowledge (implemented in v2.4.0) ✅
  - **App RAG** - SDK for third-party developers (planned)
  - **Enterprise RAG** - Org-level with admin controls (planned)

- **Private RAG Implementation** (`privateRAG.ts`):
  - IndexedDB storage for documents and embeddings
  - TensorFlow.js Universal Sentence Encoder for client-side embeddings
  - Cosine similarity search with MMR re-ranking
  - Document chunking (500 chars, 50 overlap)
  - 50MB default storage limit (configurable)
  - Progress tracking during document ingestion
  - Support for TXT, MD, JSON, PDF files

- **RAG Router** (`ragRouter.ts`):
  - Multi-source aggregation from different RAG tiers
  - Weighted result ranking
  - Deduplication with similarity threshold
  - Fallback ordering when sources unavailable
  - Context string generation for LLM injection
  - Citation extraction for responses

- **Platform Detection** (`platformDetection.ts`):
  - Automatic platform detection (web, mobile, desktop, local)
  - Capability checking (localStorage, IndexedDB, fileSystem, encryption)
  - Dynamic RAG source selection based on platform
  - Storage estimation and constraints

- **Enhanced RAG Types** (`rag-enhanced.ts`):
  - Context source configuration with isolation rules
  - Platform detection and access conditions
  - Data governance and classification
  - Skills + RAG integration types
  - Audit trail and security configuration

- **RAG React Hooks** (`useRAG.ts`):
  - `useRAG` - Query multiple sources, get context strings
  - `usePrivateRAG` - Document upload, delete, management
  - Zustand store with persistence
  - Real-time stats and progress tracking

- **RAG UI Components**:
  - `RAGSourceManager` - Configure and weight RAG sources
  - `PrivateRAGManager` - Upload and manage local documents
  - Progress indicators for document processing
  - Source health monitoring

### Architecture
- **Context Isolation**: Private data never leaves device, no cross-contamination
- **Encryption**: Local encryption with user-managed keys
- **Privacy**: Zero server storage for private RAG
- **Scalability**: Router pattern supports unlimited sources

### Technical
- **Embeddings**: TensorFlow.js Universal Sentence Encoder (512 dimensions)
- **Storage**: IndexedDB with separate stores for documents and chunks
- **Search**: Client-side cosine similarity with threshold filtering
- **Re-ranking**: Maximal Marginal Relevance (MMR) for diversity

## [2.2.0] - 2026-02-18

### Added
- **LLM Provider Integration**: Multi-provider AI support with secure API key management
  - **Supported Providers**: OpenAI, Anthropic, Local (Ollama), Custom APIs
  - **Secure Storage**: Wallet-signature encrypted API keys stored in localStorage only
  - **Cost Tracking**: Real-time budget monitoring with configurable limits ($0.10 - $5.00)
  - **Dynamic Questions**: AI-generated contextual follow-up questions
  
- **API Key Management** (`apiKeyManager.ts`):
  - AES-256-GCM encryption using wallet signature as key material
  - Decryption requires user's wallet to sign static message
  - API keys never leave the browser
  - Support for multiple provider keys
  
- **LLM Client Service** (`llmClient.ts`):
  - Universal client for OpenAI, Anthropic, Local, and Custom APIs
  - Automatic cost calculation per API call
  - Dynamic question generation based on conversation context
  - Entity extraction using LLM
  
- **Cost Tracking System** (`useCostTracker.ts`):
  - Zustand store with persistence
  - Configurable max budget and warning threshold
  - Real-time cost display with progress indicator
  - Automatic interview stop when budget exceeded
  - Cost warnings at configurable percentage (default 80%)
  
- **Provider Settings** (`useLLMSettings.ts`):
  - Provider selection with cost information
  - Custom base URL support for local/custom APIs
  - Budget configuration persistence
  
- **UI Components**:
  - `ProviderSelector` - Dropdown with provider info and cost badges
  - `ApiKeyInput` - Secure input with encryption feedback
  - `CostSettingsPanel` - Budget and threshold configuration
  - `CostDisplay` - Real-time cost tracking display
  - `LLMSettingsPanel` - Complete settings panel
  - `DynamicConversationContainer` - Enhanced chat with LLM integration

### Security
- API key encryption derived from wallet signature (user-owned keys)
- No server-side storage of API keys
- Encrypted at rest in browser localStorage
- Decryption requires active wallet connection

### Technical
- **New Dependencies**: None (uses existing ethers.js)
- **Encryption**: Web Crypto API (AES-256-GCM)
- **Storage**: localStorage with Zustand persistence
- **Cost Calculation**: Provider-specific pricing per 1K tokens

## [2.1.0] - 2026-02-17

### Added
- **Conversation UI Components**: Complete AI-powered interview interface
  - `ConversationContainer` - Main chat interface with sidebar navigation
  - `MessageBubble` - Message display with entity extraction badges
  - `InputArea` - Auto-resizing text input with voice input placeholder
  - `FixedQuestions` - Progress tracker for 3 interview questions
  - `ConversationUI` - Landing page with session management
- **3 Fixed Interview Questions**:
  1. Professional background and current work
  2. Core technical skills and technologies
  3. Career goals and project interests
- **TensorFlow.js Integration**: Universal Sentence Encoder for NLP
  - Semantic similarity calculations between responses
  - Intent classification (describing_experience, listing_skills, expressing_goals)
  - Text embeddings for ML processing
- **Entity Extraction Pipeline**: Pattern-based NLP system
  - Extracts: skills, technologies, experiences, roles, companies, durations
  - Semantic analysis: sentiment scoring, topic detection, complexity metrics
  - Confidence scoring for all extracted entities
- **LocalStorage Persistence**: Automatic conversation saving
  - Session management with create/resume/delete
  - Exported data: messages, entities, timestamps, extracted skills
  - JSON export functionality for backup/sharing
- **Zustand State Management**: `useConversation` store
  - Real-time message updates
  - Session history tracking
  - Progress through interview questions

### Technical
- **Dependencies**: Added `@tensorflow/tfjs` and `@tensorflow-models/universal-sentence-encoder`
- **Performance**: Lazy loading of TensorFlow model with progress indicator
- **Storage**: Zustand persistence middleware with localStorage backend

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

