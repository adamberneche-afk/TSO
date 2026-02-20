# TAIS Platform Changelog

All notable changes to the TAIS Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Configuration templates gallery
- Version history for configurations
- $THINK token integration (migrating from Genesis NFT)
- Multi-device sync with Supabase
- App RAG SDK for third-party developers
- Enterprise RAG with SSO integration
- Cloudflare R2 storage (when revenue positive)

### In Progress
- Monitoring & observability setup (Sprint 3)
- Performance baseline establishment
- Alert configuration

## [2.6.0] - 2026-02-19

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

### Changed
- **Interview Wizard**: Increased from 7 to 8 steps (added Knowledge step)
- **RAG Authentication**: Changed from X-API-Key header to wallet query params
- **TensorFlow.js**: Added WebGL backend with CPU fallback
- **Default Tier**: New users now get bronze tier (was free with 0 quota)

### Fixed
- **TensorFlow.js Backend**: Initialize WebGL before loading USE model
- **RAG API Auth**: Use wallet query params matching backend expectations
- **Badge Import**: Added missing Badge import to ConversationContainer
- **Document Fields**: Handle null/undefined tags and walletAddress in RAG docs
- **Deploy Workflow**: Fixed path from `tais-frontend` to `tais_frontend`
- **LLM Fallback**: Graceful fallback when LLM fails (e.g., CORS for local Ollama)

### Testing
- **E2E Test Suite**: 21/21 tests passed
  - Backend health check verified
  - Frontend accessibility confirmed
  - All API endpoints tested (skills, RAG, configurations)
  - CORS configuration validated
  - Authentication enforcement verified
  - RAG document storage/retrieval tested
  - Test report: `docs/E2E_TEST_REPORT.md`

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

