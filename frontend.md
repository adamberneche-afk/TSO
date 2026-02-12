# TAIS Frontend Development Guide

**Version:** 1.1  
**Date:** February 11, 2026  
**Status:** Implementation Phase - Skills Integration Complete (75%)

---

## 🎯 Overview

This document outlines the frontend architecture, design system, and implementation details for the TAIS (Think Agent Interview System) Platform - a configuration-first agent builder that uses structured interviews to generate executable AI agent configurations.

**Core Concept:** Interview Wizard → JSON Configuration → Deployed Agent

---

## 🏗️ Architecture

### System Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Interview     │     │  Configuration   │     │   Deployment    │
│    Wizard       │ ──► │    Generator     │ ──► │    Options      │
│  (7-10 steps)   │     │  (JSON Schema)   │     │ (Web/Desktop)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User Answers   │     │  Agent JSON      │     │  Live Agent     │
│  (Structured)   │     │  Configuration   │     │  (Running)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Component Architecture

```
TAIS Frontend (Next.js 14)
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with theme provider
│   ├── page.tsx                 # Landing page
│   ├── interview/               # Interview wizard
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── [step]/             # Dynamic step pages
│   ├── dashboard/               # My Agents dashboard
│   │   └── page.tsx
│   └── api/                     # API routes (if needed)
├── components/                  # React components
│   ├── ui/                     # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Slider.tsx
│   │   └── Select.tsx
│   ├── interview/              # Interview-specific
│   │   ├── ProgressBar.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── SkillSelector.tsx
│   │   ├── ConfigPreview.tsx
│   │   └── Navigation.tsx
│   └── layout/                 # Layout components
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Sidebar.tsx
├── lib/                         # Utilities & configs
│   ├── config-schema.ts        # Agent JSON schema
│   ├── interview-config.ts     # Interview questions mapping
│   ├── registry-client.ts      # API client for registry
│   └── theme.ts                # Theme configuration
├── hooks/                       # Custom React hooks
│   ├── useInterview.ts         # Interview state management
│   ├── useConfig.ts            # Config generation
│   └── useWallet.ts            # Wallet connection
├── types/                       # TypeScript types
│   ├── agent.ts                # Agent configuration types
│   ├── interview.ts            # Interview types
│   └── registry.ts             # Registry API types
└── public/                      # Static assets
```

---

## 🎨 Design System

### Color Palette

**Primary Colors (Dark Mode Default):**
```css
/* Backgrounds */
--bg-primary: #000000;        /* Pure black - main background */
--bg-surface: #111111;        /* Near black - secondary areas */
--bg-elevated: #1a1a1a;      /* Card backgrounds, modals */
--bg-hover: #222222;         /* Hover states */

/* Text */
--text-primary: #FFFFFF;      /* White - headings, important text */
--text-secondary: #888888;   /* Gray - body text */
--text-muted: #555555;       /* Dark gray - captions, metadata */
--text-disabled: #444444;    /* Disabled text */

/* Accent - Electric Blue */
--accent-primary: #3B82F6;   /* Primary buttons, links */
--accent-hover: #2563EB;     /* Hover state */
--accent-light: #60A5FA;     /* Light variant for backgrounds */
--accent-dark: #1D4ED8;      /* Dark variant for emphasis */
--accent-subtle: rgba(59, 130, 246, 0.1);  /* Subtle backgrounds */

/* Borders */
--border-default: #333333;   /* Default borders */
--border-focus: #3B82F6;     /* Focus state */
--border-error: #EF4444;     /* Error state */

/* Semantic Colors */
--color-success: #10B981;    /* Green - success states */
--color-warning: #F59E0B;    /* Amber - warnings */
--color-error: #EF4444;      /* Red - errors */
--color-info: #3B82F6;       /* Blue - info (same as accent) */
```

**Light Mode (Secondary):**
```css
--bg-primary-light: #FFFFFF;
--bg-surface-light: #F5F5F5;
--text-primary-light: #000000;
--text-secondary-light: #666666;
```

### Typography

**Font Families:**
- **Headlines:** `Fira Sans Extra Condensed`, weight 500
- **Body:** `Inter`, weights 400/500/700
- **Code/JSON:** `JetBrains Mono` or `Fira Code`, weight 400

**Type Scale:**

| Style | Font | Size | Weight | Line Height | Usage |
|-------|------|------|--------|-------------|-------|
| **H1** | Fira Sans Extra Condensed | 48px | 500 | 1.1 | Page titles |
| **H2** | Fira Sans Extra Condensed | 36px | 500 | 1.2 | Section headers |
| **H3** | Fira Sans Extra Condensed | 28px | 500 | 1.3 | Card titles |
| **H4** | Fira Sans Extra Condensed | 24px | 500 | 1.4 | Subsection titles |
| **H5** | Inter | 20px | 600 | 1.4 | Feature titles |
| **Body Large** | Inter | 18px | 400 | 1.6 | Important text |
| **Body** | Inter | 16px | 400 | 1.6 | Regular text |
| **Body Small** | Inter | 14px | 400 | 1.5 | Secondary text |
| **Caption** | Inter | 12px | 500 | 1.4 | Labels, metadata |
| **Code** | JetBrains Mono | 14px | 400 | 1.5 | JSON/config display |

### Spacing System

**Base Unit:** 4px

| Token | Value | Usage |
|-------|-------|-------|
| **xs** | 4px | Tight spacing, icon padding |
| **sm** | 8px | Small gaps, button padding |
| **md** | 16px | Standard spacing, card padding |
| **lg** | 24px | Section padding, container gutters |
| **xl** | 32px | Large sections, form spacing |
| **2xl** | 48px | Page sections, major divisions |
| **3xl** | 64px | Hero sections, major breaks |

### Border Radius

- **Small:** 4px (inputs, small buttons)
- **Medium:** 6px (buttons, cards)
- **Large:** 8px (modals, large cards)
- **Full:** 9999px (pills, badges)

### Shadows

**Dark Mode (Minimal/Flat):**
- Default: `none` (use borders instead)
- Elevated: `0 4px 6px -1px rgba(0, 0, 0, 0.5)`
- Modal: `0 25px 50px -12px rgba(0, 0, 0, 0.7)`

### Components

#### Buttons

**Primary Button:**
```
Background: #3B82F6
Text: #FFFFFF
Padding: 12px 24px
Border-radius: 6px
Font: Inter 500, 16px
Hover: Background #2563EB
Disabled: Background #1a1a1a, Text #555555
```

**Secondary Button:**
```
Background: transparent
Border: 1px solid #333333
Text: #FFFFFF
Padding: 12px 24px
Border-radius: 6px
Hover: Background #1a1a1a
```

**Ghost Button:**
```
Background: transparent
Text: #3B82F6
Padding: 12px 24px
Hover: Text #60A5FA
```

**Icon Button:**
```
Background: transparent
Padding: 8px
Border-radius: 6px
Hover: Background rgba(255, 255, 255, 0.1)
```

#### Cards

**Default Card:**
```
Background: #1a1a1a
Border: 1px solid #333333
Border-radius: 8px
Padding: 24px
```

**Elevated Card:**
```
Background: #1a1a1a
Border: 1px solid #333333
Border-radius: 8px
Padding: 24px
Box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5)
```

**Hover State:**
```
Border: 1px solid #3B82F6
Transform: translateY(-2px)
Transition: all 0.2s ease
```

#### Inputs

**Text Input:**
```
Background: #111111
Border: 1px solid #333333
Border-radius: 6px
Padding: 12px 16px
Text: #FFFFFF
Placeholder: #555555
Focus: Border #3B82F6, outline none
Error: Border #EF4444
```

**Select/Dropdown:**
```
Same as text input
Dropdown background: #1a1a1a
Dropdown border: #333333
Option hover: #222222
Selected: Background rgba(59, 130, 246, 0.2)
```

**Slider:**
```
Track: #333333 (height: 4px)
Fill: #3B82F6
Thumb: #FFFFFF (16px circle)
Thumb border: 2px solid #3B82F6
Thumb hover: Scale 1.1
```

#### Progress Indicators

**Progress Bar:**
```
Background track: #333333
Fill: #3B82F6
Height: 4px
Border-radius: 2px
```

**Step Indicator:**
```
Active step: Background #3B82F6, Text white
Completed step: Background #10B981, Icon check
Upcoming step: Background #333333, Text #888888
Connector line: #333333 (upcoming), #3B82F6 (completed)
```

---

## 🧩 Interview System

### Interview Flow (7-10 Steps)

**Step 1: Welcome & Goals (2 minutes)**
- Screen: Full-page welcome with value proposition
- Question 1: "What will your agent help you with?"
  - Type: Multi-select cards
  - Options: Work/Professional, Learning/Education, Creative Projects, Personal Organization, Entertainment, Other
  - Maps to: `agent.goals[]`
- Question 2: "Describe your ideal day with this agent"
  - Type: Text area (optional)
  - Placeholder: "Example: My agent checks my calendar each morning, summarizes my emails, and suggests priorities..."
  - Maps to: `agent.description`

**Step 2: Skill Selection (2 minutes)** ✅ **IMPLEMENTED**
- Screen: Full-page skills browser with search and selection summary
- Features:
  - **Live API Integration**: Fetches real skills from `tso.onrender.com/api/skills`
  - **Search**: Real-time filter by name/description
  - **Trust Score Visualization**: 
    - Color-coded badges: Green (≥80%), Yellow (60-79%), Orange (40-59%), Red (<40%)
    - Progress bars showing exact percentages
  - **Skill Cards Display**:
    - Name, version, description
    - Download count
    - Categories/tags
    - Trust score with visual indicators
  - **Selection Management**:
    - Toggle skills on/off with visual feedback (ring highlight)
    - Selected skills summary panel with count and names
    - "Clear All" button to remove all selections
  - **Loading States**: Spinner with "Loading skills from registry..." message
  - **Error Handling**: Retry button for failed API calls
- Responsive Grid: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)
- Maps to: `agent.skills[]`
- **Status**: ✅ Complete and functional
- **Commit**: `2b1cf41`

**Step 3: Behavior Configuration (2 minutes)**
- Screen: Sliders and toggles
- Questions:
  - "Communication style"
    - Slider: Direct ←→ Conversational
    - Maps to: `agent.personality.tone`
  
  - "Detail level"
    - Slider: Brief ←→ Comprehensive
    - Maps to: `agent.personality.verbosity`
  
  - "Formality"
    - Slider: Casual ←→ Professional
    - Maps to: `agent.personality.formality`
  
  - "Autonomy level"
    - Radio buttons:
      - Ask before every action
      - Suggest actions, wait for confirmation
      - Act independently within constraints
    - Maps to: `agent.autonomy.level`

**Step 4: Privacy & Constraints (1 minute)**
- Screen: Toggle switches and select dropdowns
- Questions:
  - "Privacy preference"
    - Options: Maximum privacy (local-first), Balanced, Convenience-first
    - Maps to: `agent.constraints.privacy`
  
  - "Budget per action"
    - Slider: $0.01 ←→ $1.00
    - Maps to: `agent.constraints.maxCostPerAction`
  
  - "Allowed capabilities"
    - Checkboxes:
      - Network requests
      - File system access
      - External API calls
      - Code execution
    - Maps to: `agent.permissions`

**Step 5: Identity & Naming (1 minute)** ✅ **IMPLEMENTED**
- Screen: Form inputs + wallet connection card
- Features:
  - **Agent Name Input**
    - Type: Text input with validation
    - Placeholder: "e.g., DataAnalyzer, CalendarAssistant"
    - Validation: Required, alphanumeric + hyphens, no spaces
    - Maps to: `agent.name`
  
  - **Wallet Connection** ✅ Complete MetaMask Integration
    - **Not Connected State:**
      - "Connect MetaMask" button with wallet icon
      - Loading spinner during connection
      - Error messages for rejections or failures
      - Info box explaining wallet benefits
    - **Connected State:**
      - Green styling with success indicator
      - Formatted wallet address (0x1234...5678)
      - Pulse animation for live connection
      - Genesis holder features list:
        - ✓ Own agent as NFT on blockchain
        - ✓ Access exclusive Genesis features
        - ✓ Publish and audit skills
      - Disconnect button
    - **Auto-sync:** Wallet address automatically saved to configuration
    - **Event Handling:** Listens for account changes and chain switches
    - Maps to: `agent.walletAddress`
    - **Library:** ethers.js v6 with BrowserProvider
- **Status:** ✅ Complete and functional
- **Commit:** `use-wallet` hook + IdentityStep updates

**Step 6: Review Configuration (2 minutes)** ✅ **IMPLEMENTED**
- Screen: Split view with summary and JSON editor
- Left side: Interview summary card
  - Agent name
  - Goals list
  - Selected skills with trust scores
  - Personality settings (Tone, Verbosity, Formality)
  - Privacy level
  - Autonomy level
  - Wallet connection status (with green indicator if connected)
- Right side: Monaco Editor JSON preview ✅ Complete
  - **Editor Features:**
    - Monaco Editor with syntax highlighting
    - Dark theme (vs-dark) matching app design
    - Fira Code font with ligatures
    - Line numbers, bracket matching, code folding
    - Word wrap and indentation guides
  - **Toolbar Controls:**
    - Edit/View toggle button
    - Format JSON button (in edit mode)
    - Copy to clipboard button
    - Loading spinner during initialization
  - **Modes:**
    - Read-only by default (green status indicator)
    - Edit mode for advanced users (yellow status indicator)
    - Changes in editor don't affect store (preview only)
  - **Status Bar:**
    - Shows current mode (Read-Only or Editing)
    - Language indicator (JSON)
- Actions:
  - "Edit Configuration" button (placeholder)
- **Status:** ✅ Complete with Monaco Editor
- **Commit:** MonacoEditor component + ReviewStep updates

**Step 7: Deployment Options (1 minute)**
- Screen: Cards for deployment options
- Options:
  - **Web Agent**
    - Description: "Run in your browser"
    - Features: Chat interface, instant access
    - Button: "Deploy Web Agent"
  
  - **Desktop App**
    - Description: "Download for Windows/Mac/Linux"
    - Features: Local execution, offline capable
    - Button: "Download Desktop App"
  
  - **API Endpoint**
    - Description: "Access via HTTP API"
    - Features: Integrate into your apps
    - Button: "Get API Key"
  
  - **Export Config**
    - Description: "Download raw JSON"
    - Features: Self-host anywhere
    - Button: "Download JSON"

**Step 8: Success (30 seconds)**
- Screen: Celebration/confetti animation
- Display:
  - "Your agent is ready!"
  - Agent name and avatar
  - Quick links: "Open Agent", "View Documentation", "Share"
  - Social sharing buttons

### Interview State Management

**State Structure:**
```typescript
interface InterviewState {
  currentStep: number;
  totalSteps: number;
  answers: {
    goals: string[];
    description?: string;
    skills: SelectedSkill[];
    personality: {
      tone: number;        // 0-100 slider
      verbosity: number;   // 0-100 slider
      formality: number;   // 0-100 slider
    };
    autonomy: 'confirm' | 'suggest' | 'independent';
    privacy: 'local' | 'balanced' | 'cloud';
    maxCost: number;
    permissions: string[];
    name: string;
    walletAddress?: string;
  };
  config: AgentConfig | null;
  isGenerating: boolean;
  deploymentOption?: DeploymentType;
}
```

**Progress Persistence:**
- Save to localStorage after each step
- Key: `tais-interview-${timestamp}`
- Auto-resume on return
- Expire after 7 days

---

## 🔌 Integration with Registry API

### API Client Configuration

```typescript
// lib/registry-client.ts

const REGISTRY_API_URL = import.meta.env.VITE_REGISTRY_URL || 
  'https://tso.onrender.com';

interface RegistryClientConfig {
  baseURL: string;
  headers?: Record<string, string>;
}

class RegistryClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(config: RegistryClientConfig) {
    this.baseURL = config.baseURL;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  // Set wallet address for authenticated requests
  setWalletAddress(address: string) {
    this.headers['X-Wallet-Address'] = address;
  }

  // Fetch all skills
  async getSkills(params?: {
    category?: string;
    search?: string;
    trending?: boolean;
  }): Promise<Skill[]> {
    const queryParams = new URLSearchParams(params as Record<string, string>);
    const response = await fetch(
      `${this.baseURL}/api/skills?${queryParams}`,
      { headers: this.headers }
    );
    if (!response.ok) throw new Error('Failed to fetch skills');
    return response.json();
  }

  // Fetch skill details
  async getSkill(skillHash: string): Promise<Skill> {
    const response = await fetch(
      `${this.baseURL}/api/skills/${skillHash}`,
      { headers: this.headers }
    );
    if (!response.ok) throw new Error('Failed to fetch skill');
    return response.json();
  }

  // Publish skill (requires NFT)
  async publishSkill(skillData: CreateSkillDTO): Promise<Skill> {
    const response = await fetch(`${this.baseURL}/api/skills`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(skillData),
    });
    if (!response.ok) throw new Error('Failed to publish skill');
    return response.json();
  }

  // Search skills
  async searchSkills(query: string): Promise<SearchResults> {
    const response = await fetch(
      `${this.baseURL}/api/search?q=${encodeURIComponent(query)}`,
      { headers: this.headers }
    );
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  }

  // Get trending skills
  async getTrendingSkills(): Promise<Skill[]> {
    const response = await fetch(
      `${this.baseURL}/api/search/trending`,
      { headers: this.headers }
    );
    if (!response.ok) throw new Error('Failed to fetch trending');
    return response.json();
  }
}

export const registryClient = new RegistryClient({
  baseURL: REGISTRY_API_URL,
});
```

### Skill Selection Component

```typescript
// components/interview/SkillSelector.tsx

interface SkillSelectorProps {
  selectedGoals: string[];
  selectedSkills: SelectedSkill[];
  onSkillToggle: (skill: Skill) => void;
}

export function SkillSelector({
  selectedGoals,
  selectedSkills,
  onSkillToggle,
}: SkillSelectorProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    // Fetch skills filtered by goals
    const fetchSkills = async () => {
      try {
        const data = await registryClient.getSkills({
          category: selectedGoals[0], // Use first goal as filter
        });
        setSkills(data.skills);
      } catch (error) {
        console.error('Failed to fetch skills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [selectedGoals]);

  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(filter.toLowerCase()) ||
    skill.description?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Input
        placeholder="Search skills..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSkills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            isSelected={selectedSkills.some(s => s.id === skill.id)}
            onToggle={() => onSkillToggle(skill)}
          />
        ))}
      </div>
    </div>
  );
}

// Skill card component
function SkillCard({ skill, isSelected, onToggle }: SkillCardProps) {
  const trustScoreColor =
    skill.trustScore >= 0.8 ? 'text-green-500' :
    skill.trustScore >= 0.6 ? 'text-yellow-500' :
    'text-red-500';

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : ''
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white">{skill.name}</h3>
          <p className="text-sm text-gray-400 mt-1">{skill.description}</p>
        </div>
        <div className={`text-sm font-medium ${trustScoreColor}`}>
          Trust: {Math.round(skill.trustScore * 100)}%
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
        <span>v{skill.version}</span>
        <span>{skill.downloadCount} downloads</span>
        <span>{skill.categories?.[0]?.name}</span>
      </div>
    </Card>
  );
}
```

---

## 🔐 Wallet Integration

### Wallet Connection Hook

```typescript
// hooks/useWallet.ts

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface UseWalletReturn {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  hasGenesisNFT: boolean;
  checkGenesisNFT: () => Promise<boolean>;
}

export function useWallet(): UseWalletReturn {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenesisNFT, setHasGenesisNFT] = useState(false);

  const GENESIS_CONTRACT = '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';

  const connect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        
        // Check for Genesis NFT
        const hasNFT = await checkGenesisNFT(accounts[0], provider);
        setHasGenesisNFT(hasNFT);
        
        // Set wallet for registry API
        registryClient.setWalletAddress(accounts[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    setHasGenesisNFT(false);
    registryClient.setWalletAddress('');
  };

  const checkGenesisNFT = async (
    walletAddress: string,
    provider: ethers.BrowserProvider
  ): Promise<boolean> => {
    try {
      const abi = ['function balanceOf(address owner) view returns (uint256)'];
      const contract = new ethers.Contract(
        GENESIS_CONTRACT,
        abi,
        provider
      );
      const balance = await contract.balanceOf(walletAddress);
      return balance > 0;
    } catch (error) {
      console.error('Failed to check Genesis NFT:', error);
      return false;
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAddress(accounts[0]);
          checkGenesisNFT(accounts[0], new ethers.BrowserProvider(window.ethereum));
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  return {
    address,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    hasGenesisNFT,
    checkGenesisNFT: () => checkGenesisNFT(address!, new ethers.BrowserProvider(window.ethereum)),
  };
}
```

---

## 📁 Configuration Generation

### Agent JSON Schema

```typescript
// lib/config-schema.ts

import { z } from 'zod';

// Skill reference in agent config
export const SkillReferenceSchema = z.object({
  id: z.string(),
  source: z.enum(['registry', 'local', 'url']),
  version: z.string(),
  hash: z.string().optional(), // IPFS hash or content hash
  permissions: z.array(z.string()),
  trustScore: z.number().min(0).max(1),
});

// Personality configuration
export const PersonalitySchema = z.object({
  tone: z.enum(['direct', 'balanced', 'conversational']),
  verbosity: z.enum(['brief', 'balanced', 'detailed']),
  formality: z.enum(['casual', 'balanced', 'professional']),
});

// Autonomy settings
export const AutonomySchema = z.object({
  level: z.enum(['confirm', 'suggest', 'independent']),
  requireConfirmationFor: z.array(z.string()).optional(), // High-risk actions
});

// Privacy and constraints
export const ConstraintsSchema = z.object({
  privacy: z.enum(['local', 'balanced', 'cloud']),
  maxCostPerAction: z.number().min(0).default(0.1),
  allowedDomains: z.array(z.string()).optional(),
  blockedModules: z.array(z.string()).default(['child_process']),
  maxFileSize: z.number().default(1048576), // 1MB
});

// Owner information
export const OwnerSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  email: z.string().email().optional(),
});

// Complete agent configuration
export const AgentConfigSchema = z.object({
  agent: z.object({
    name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9-_]+$/),
    version: z.string().default('1.0.0'),
    description: z.string().optional(),
    goals: z.array(z.string()),
    skills: z.array(SkillReferenceSchema),
    personality: PersonalitySchema,
    autonomy: AutonomySchema,
    constraints: ConstraintsSchema,
    owner: OwnerSchema.optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  }),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type SkillReference = z.infer<typeof SkillReferenceSchema>;
```

### Interview to Config Mapping

```typescript
// lib/interview-config.ts

import { AgentConfig, InterviewAnswers } from '@/types';

export function generateAgentConfig(
  answers: InterviewAnswers
): AgentConfig {
  const config: AgentConfig = {
    agent: {
      name: answers.name,
      version: '1.0.0',
      description: answers.description,
      goals: answers.goals,
      skills: answers.skills.map(skill => ({
        id: skill.id,
        source: 'registry',
        version: skill.version,
        hash: skill.skillHash,
        permissions: Object.keys(skill.permissions || {}),
        trustScore: skill.trustScore,
      })),
      personality: {
        tone: mapSliderToTone(answers.personality.tone),
        verbosity: mapSliderToVerbosity(answers.personality.verbosity),
        formality: mapSliderToFormality(answers.personality.formality),
      },
      autonomy: {
        level: answers.autonomy,
      },
      constraints: {
        privacy: answers.privacy,
        maxCostPerAction: answers.maxCost,
        permissions: answers.permissions,
      },
      owner: answers.walletAddress
        ? { walletAddress: answers.walletAddress }
        : undefined,
      createdAt: new Date().toISOString(),
    },
  };

  return AgentConfigSchema.parse(config);
}

// Helper functions to map slider values (0-100) to enums
function mapSliderToTone(value: number): string {
  if (value < 33) return 'direct';
  if (value < 66) return 'balanced';
  return 'conversational';
}

function mapSliderToVerbosity(value: number): string {
  if (value < 33) return 'brief';
  if (value < 66) return 'balanced';
  return 'detailed';
}

function mapSliderToFormality(value: number): string {
  if (value < 33) return 'casual';
  if (value < 66) return 'balanced';
  return 'professional';
}
```

---

## 🚀 Implementation Roadmap

### Week 1: Project Setup
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Configure Tailwind CSS with THINK design system
- [ ] Set up folder structure (app/, components/, lib/, hooks/, types/)
- [ ] Install dependencies:
  ```bash
  npm install zustand zod framer-motion @monaco-editor/react ethers
  npm install -D @types/react @types/node
  ```
- [ ] Configure environment variables
- [ ] Set up ESLint and Prettier

### Week 2: Design System & Components
- [ ] Create base UI components (Button, Card, Input, Slider)
- [ ] Implement dark/light mode toggle
- [ ] Create theme provider
- [ ] Build component storybook (optional)
- [ ] Responsive layout components

### Week 3: Interview Wizard Core
- [ ] Build multi-step interview layout
- [ ] Implement progress indicator
- [ ] Create question components (multi-select, slider, text)
- [ ] Set up interview state management (Zustand)
- [ ] Add localStorage persistence

### Week 4: Registry Integration
- [ ] Create Registry API client
- [ ] Build skill selector component
- [ ] Implement skill filtering by goals
- [ ] Display trust scores and metadata
- [ ] Add skill detail modal

### Week 5: Config Generation & Preview
- [ ] Implement config generation logic
- [ ] Add JSON preview with Monaco Editor
- [ ] Create config validation
- [ ] Build review/edit screen
- [ ] Add download/export functionality

### Week 6: Wallet & Deployment
- [ ] Integrate MetaMask connection
- [ ] Check Genesis NFT ownership
- [ ] Build deployment options UI
- [ ] Create agent dashboard
- [ ] Add "My Agents" list view

### Week 7: Polish & Testing
- [ ] Add animations and transitions
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Write basic tests
- [ ] Performance optimization

### Week 8: Documentation & Launch
- [ ] Write user documentation
- [ ] Create tutorial videos
- [ ] Final testing with beta users
- [ ] Deploy to production
- [ ] Announce to community

---

## 📚 Environment Variables

Create `.env.local`:

```bash
# Registry API
VITE_REGISTRY_URL=https://tso.onrender.com

# Blockchain
VITE_RPC_URL=https://cloudflare-eth.com
VITE_GENESIS_CONTRACT=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6

# Deployment
VITE_APP_URL=http://localhost:5173
```

---

## 🧪 Testing Strategy

### Unit Tests
- Component rendering tests
- Hook logic tests
- Utility function tests
- Schema validation tests

### Integration Tests
- Interview flow E2E tests
- Registry API integration tests
- Wallet connection tests
- Config generation tests

### User Testing
- Beta test with 5-10 Genesis holders
- Gather feedback on interview flow
- Test on different devices/browsers
- Validate generated configs work

---

## 📖 Documentation

### User Documentation
- Getting started guide
- Interview walkthrough
- Skill selection guide
- Deployment options explained
- FAQ

### Developer Documentation
- API reference
- Component library
- Customization guide
- Contributing guidelines

---

## 🎯 Success Metrics

**Beta Phase (Weeks 1-4):**
- 10+ agents created
- 5+ active users
- 80%+ completion rate for interviews
- <2min average interview time

**Public Launch (Weeks 5-8):**
- 50+ agents created
- 20+ active users
- 90%+ user satisfaction
- 0 critical bugs

---

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

---

**Last Updated:** February 11, 2026  
**Version:** 1.0  
**Status:** Ready for Implementation
