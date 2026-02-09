#!/bin/bash

# TAIS CLI Demo Script
# Demonstrates all CLI commands with mock data

echo "🚀 TAIS CLI Demo"
echo "================"

# Create a mock skill directory for testing
mkdir -p demo-skill
cat > demo-skill/manifest.json << 'EOF'
{
  "name": "demo-skill",
  "version": "1.0.0",
  "author": "0x1234567890123456789012345678901234567890",
  "skill_hash": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "permissions": {
    "network": { "domains": ["api.example.com"] },
    "filesystem": { "read": ["/tmp"], "write": [] },
    "env_vars": [],
    "modules": ["axios", "lodash"]
  }
}
EOF

echo "📦 Creating mock skill..."
echo "✅ Demo skill created"

# Create .tais directory and mock installed skills
mkdir -p .tais/skills
cat > .tais/skills.json << 'EOF'
[
  {
    "name": "weather-skill",
    "version": "1.2.0",
    "author": "0x1234567890123456789012345678901234567890",
    "skill_hash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "risk_level": "low",
    "trust_score": 0.85,
    "installed_at": "2024-01-15T10:30:00Z",
    "permissions": {
      "network": { "domains": ["api.weather.com"] },
      "filesystem": { "read": [], "write": [] },
      "env_vars": [],
      "modules": ["axios"]
    }
  },
  {
    "name": "data-processor",
    "version": "2.0.0",
    "author": "0x9876543210987654321098765432109876543210",
    "skill_hash": "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
    "risk_level": "medium",
    "trust_score": 0.72,
    "installed_at": "2024-01-10T14:22:00Z",
    "permissions": {
      "network": { "domains": ["api.data.com", "backup.data.com"] },
      "filesystem": { "read": ["/data"], "write": ["/tmp"] },
      "env_vars": ["API_KEY"],
      "modules": ["pandas", "requests", "numpy"]
    }
  }
]
EOF

echo "📋 Setting up mock installed skills..."
echo "✅ Mock environment ready"

echo ""
echo "🎯 Demo Commands:"
echo "================"

echo ""
echo "1️⃣  List installed skills:"
echo "   tais list"
node dist/index.js list

echo ""
echo "2️⃣  List with verbose output:"
echo "   tais list --verbose"
node dist/index.js list --verbose

echo ""
echo "3️⃣  List by risk level:"
echo "   tais list --risk"
node dist/index.js list --risk

echo ""
echo "4️⃣  Verify skill security:"
echo "   tais verify 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
node dist/index.js verify 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

echo ""
echo "5️⃣  Verify author:"
echo "   tais verify --author 0x1234567890123456789012345678901234567890"
node dist/index.js verify --author 0x1234567890123456789012345678901234567890

echo ""
echo "6️⃣  Configuration management:"
echo "   tais config --list"
node dist/index.js config --list

echo ""
echo "7️⃣  Set configuration:"
echo "   tais config --set auto_approve_low_risk=true"
node dist/index.js config --set auto_approve_low_risk=true

echo ""
echo "8️⃣  Get configuration:"
echo "   tais config --get auto_approve_low_risk"
node dist/index.js config --get auto_approve_low_risk

echo ""
echo "9️⃣  Install demo skill (interactive - will show prompts):"
echo "   tais install demo-skill"
echo "   (Skipping interactive demo - run manually to test)"

echo ""
echo "🔟  Remove skill (interactive - will show prompts):"
echo "   tais remove weather-skill"
echo "   (Skipping interactive demo - run manually to test)"

echo ""
echo "📊 Audit demo (interactive - will show prompts):"
echo "   tais audit 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
echo "   (Skipping interactive demo - run manually to test)"

echo ""
echo "✅ Demo completed!"
echo ""
echo "📚 Available commands:"
echo "   tais install <skill>     - Install skill with security checks"
echo "   tais list                - List installed skills"
echo "   tais remove <skill>      - Remove installed skill"
echo "   tais verify <target>     - Verify skill or author"
echo "   tais audit <skill>       - Submit security audit"
echo "   tais config              - Manage configuration"
echo ""
echo "🔧 Try interactive commands:"
echo "   tais install demo-skill"
echo "   tais remove weather-skill"
echo "   tais config"
echo ""
echo "🧹 Cleanup: rm -rf demo-skill .tais"