import { UserProfile } from '@think/types';

export const MOCK_PROFILE: UserProfile = {
  version: "1.0",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-23T12:00:00.000Z",
  wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  identity: {
    primary_activity: "building",
    secondary_activities: ["trading", "learning"],
    project_types: ["DeFi", "NFT", "DAO Tools"],
    experience_level: "advanced"
  },
  technical: {
    preferred_chains: ["ethereum", "base", "optimism"],
    wallets: ["metamask", "rainbow"],
    dev_tools: ["cursor", "hardhat", "foundry"],
    programming_languages: ["typescript", "solidity", "rust"]
  },
  work_patterns: {
    active_hours: {
      start: "09:00",
      end: "22:00",
      timezone: "America/Los_Angeles"
    },
    work_style: "focused_sprints",
    productivity_peak: "late_night"
  },
  notifications: {
    enabled: true,
    urgency_threshold: "high",
    quiet_hours: {
      enabled: true,
      start: "23:00",
      end: "08:00"
    },
    channels: {
      push: true,
      email: true,
      discord: false,
      telegram: false
    }
  },
  finance: {
    risk_tolerance: "moderate_aggressive",
    portfolio_size_tier: "medium",
    investment_horizon: "medium_term"
  },
  communication: {
    tone: "technical",
    verbosity: "balanced"
  },
  preferences: {
    theme: "dark",
    default_currency: "USD",
    gas_price_alert_threshold: 50
  },
  metadata: {
    device_id: "dev-mode-device-12345",
    interview_duration_seconds: 180,
    questions_answered: 10,
    confidence_score: 0.95,
    genesis_nft_verified: true,
    last_updated_by: "mock_data",
    telemetry_opt_in: false
  }
};
