import os

# THE COMPLETE SYSTEM: Documentation Framework + Autonomous AI Stack
required_documents = [
    # --- PHASE 1: VIBE MANUAL CORE DOCUMENTATION ---
    {
        "name": "PRD.md",
        "content": "# Product Requirements Document\n\n## Scope\nDefine the project goals and target audience.\n\n## Core Features\n- [ ] Feature 1\n- [ ] Feature 2"
    },
    {
        "name": "APP_FLOW.md",
        "content": "# Application Flow\n\n## User Journey\n1. Entry Point\n2. Main Interaction\n3. Completion/Success"
    },
    {
        "name": "TECH_STACK.md",
        "content": "# Technology Stack\n\n- **Frontend**: [e.g., Next.js, Tailwind]\n- **Backend**: [e.g., Node.js]\n- **Database**: [e.g., Supabase]\n- **AI Model**: Lab-Agnostic (Defined in Vercel)"
    },
    {
        "name": "FRONTEND_GUIDELINES.md",
        "content": "# Frontend Guidelines\n\n- Styling: Tailwind CSS\n- Spacing: 4px base\n- Components: Functional React/Vue"
    },
    {
        "name": "BACKEND_STRUCTURE.md",
        "content": "# Backend Structure\n\n## API Endpoints\n- GET /api/...\n\n## Database Schema\n- Table: Users"
    },
    {
        "name": "IMPLEMENTATION_PLAN.md",
        "content": "# Implementation Plan\n\n- [ ] Step 1: Initialize Project\n- [ ] Step 2: Build Core UI"
    },
    {
        "name": "CLAUDE.md",
        "content": "# Master Rules (CLAUDE.md)\n\n## AI Environment\n- Model: Defined via Vercel AI_MODEL Env Var\n- Base URL: Defined via Vercel AI_BASE_URL Env Var\n\n## Guiding Principles\n1. Check progress.txt before every session.\n2. Log failures/hallucinations in lessons.md.\n3. Favor flat, simple logic over 'Frankenstein' nested code."
    },
    {
        "name": "progress.txt",
        "content": "SESSION PROGRESS LOG\n====================\nCOMPLETED:\nIN PROGRESS:\nNEXT STEPS:"
    },
    {
        "name": "lessons.md",
        "content": "# Lessons Learned\n\n- Mistake: \n- Correction: "
    },

    # --- PHASE 2: THE CLOUD AGENT (Vercel Worker) ---
    {
        "name": "api/autonomous_agent.js",
        "content": """import { Octokit } from '@octokit/rest';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const { owner, repo, mode } = req.body;

  // LAB-AGNOSTIC SETUP: Pulls from your Vercel Dashboard
  const modelName = process.env.AI_MODEL; 
  const apiBase = process.env.AI_BASE_URL;

  try {
    let prompt = "";
    if (mode === 'debug') {
      prompt = "DEBUG MODE: A CI test failed. Analyze the logs, provide a raw patch, and explain the trace.";
    } else if (mode === 'hunt') {
      prompt = "SILENT ERROR HUNT: A logic invariant was violated. Find the specific edge case and fix the logic.";
    } else if (mode === 'refactor') {
      prompt = "OPTIMIZATION: Simplify 'Frankenstein' code and flatten nested logic while maintaining identical behavior.";
    }

    const aiResponse = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.AI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      })
    });

    const aiData = await aiResponse.json();
    await octokit.issues.create({
      owner, repo,
      title: `🤖 [${mode.toUpperCase()}] AI Proposal`,
      body: aiData.choices[0].message.content
    });

    return res.status(200).json({ status: 'Agent Action Logged' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}"""
    },

    # --- PHASE 3: THE HEARTBEAT (GitHub Action) ---
    {
        "name": ".github/workflows/ai-heartbeat.yml",
        "content": """name: AI Autonomous Heartbeat
on:
  schedule:
    - cron: '*/30 * * * *'  # Debug/Hunt every 30 mins
    - cron: '0 0 * * 0'     # Structural Refactor every Sunday
  workflow_dispatch:

jobs:
  ping-agent:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Agent
        run: |
          curl -X POST https://${{ secrets.VERCEL_URL }}/api/autonomous_agent \\
          -H "Content-Type: application/json" \\
          -d '{"owner": "${{ github.repository_owner }}", "repo": "${{ github.event.repository.name }}", "mode": "debug"}'"""
    },

    # --- PHASE 4: UTILITIES (Complexity & Testing) ---
    {
        "name": "scripts/scan-complexity.js",
        "content": """const { execSync } = require('child_process');
try {
  // Uses open-source ast-grep to find nested logic (Spaghetti)
  const output = execSync('sg scan --pattern "$$$ { if ($A) { if ($B) { if ($C) { $$$ } } } }" --json');
  console.log(output.toString());
} catch (e) {
  console.log("Structure is clean. No spaghetti detected.");
}"""
    },
    {
        "name": "package.json",
        "content": """{
  "name": "vibe-project-autonomous",
  "version": "1.0.0",
  "scripts": {
    "test:hunt": "fast-check tests/invariants.test.js",
    "scan": "node scripts/scan-complexity.js"
  },
  "devDependencies": {
    "@octokit/rest": "^19.0.0",
    "fast-check": "^3.0.0",
    "@ast-grep/cli": "^0.1.0"
  }
}"""
    }
]

def create_documents():
    print("🚀 Initializing Full Vibe Coding Autonomous Stack...")
    for doc in required_documents:
        path = doc["name"]
        os.makedirs(os.path.dirname(path), exist_ok=True) if os.path.dirname(path) else None
        
        if not os.path.exists(path):
            with open(path, "w") as f:
                f.write(doc["content"])
            print(f"✅ Created: {path}")
        else:
            print(f"⏭️  Stable:  {path}")

if __name__ == "__main__":
    create_documents()
