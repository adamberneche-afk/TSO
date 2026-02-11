"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useInterviewStore, SelectedSkill } from "@/hooks/use-interview-store";
import { useWallet, formatAddress } from "@/hooks/use-wallet";
import { registryClient, Skill } from "@/lib/registry-client";
import { 
  Sparkles, 
  Shield, 
  Zap, 
  Wallet,
  Search,
  Loader2,
  AlertCircle,
  Check,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { MonacoEditor } from "@/components/ui/monaco-editor";

export default function InterviewPage() {
  const { currentStep, nextStep, setStep } = useInterviewStore();

  // Welcome Screen
  if (currentStep === 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mb-6 p-4 rounded-full bg-[var(--accent-subtle)]">
          <Sparkles className="w-12 h-12 text-[var(--accent-primary)]" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
          Create Your AI Agent
        </h1>
        
        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-8">
          Answer a few questions about your goals and preferences. We'll help you 
          configure a custom agent with verified skills from the registry.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl w-full">
          <Card>
            <CardHeader className="pb-3">
              <Zap className="w-8 h-8 text-[var(--accent-primary)] mb-2" />
              <CardTitle className="text-lg">Quick Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-muted)]">
                7 simple steps, takes about 5 minutes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Shield className="w-8 h-8 text-[var(--color-success)] mb-2" />
              <CardTitle className="text-lg">Verified Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-muted)]">
                All skills audited and scored for trust
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Wallet className="w-8 h-8 text-[var(--color-warning)] mb-2" />
              <CardTitle className="text-lg">You Own It</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-muted)]">
                Optional: Connect wallet to own as NFT
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" onClick={nextStep}>
            Start Interview
          </Button>
          <Button variant="secondary" size="lg" onClick={() => window.location.href = "/"}>
            Back to Home
          </Button>
        </div>

        <p className="mt-6 text-sm text-[var(--text-muted)]">
          💎 Pro Tip: Connect your wallet to access Genesis holder features
        </p>
      </div>
    );
  }

  // Step 2: Goals
  if (currentStep === 2) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            What will your agent do?
          </h2>
          <p className="text-[var(--text-secondary)]">
            Select all that apply. This helps us recommend the right skills.
          </p>
        </div>

        <GoalsStep />
      </div>
    );
  }

  // Step 3: Skills
  if (currentStep === 3) {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Select Skills
          </h2>
          <p className="text-[var(--text-secondary)]">
            Choose from verified skills that match your goals. All skills are audited and scored for trust.
          </p>
        </div>
        
        <SkillsStep />
      </div>
    );
  }

  // Step 4: Personality
  if (currentStep === 4) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Configure Behavior
          </h2>
          <p className="text-[var(--text-secondary)]">
            Adjust sliders to match your preferred style.
          </p>
        </div>

        <PersonalityStep />
      </div>
    );
  }

  // Step 5: Privacy
  if (currentStep === 5) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Privacy & Constraints
          </h2>
          <p className="text-[var(--text-secondary)]">
            Set boundaries for your agent.
          </p>
        </div>

        <PrivacyStep />
      </div>
    );
  }

  // Step 6: Identity
  if (currentStep === 6) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Name Your Agent
          </h2>
          <p className="text-[var(--text-secondary)]">
            Give your agent a unique identity.
          </p>
        </div>

        <IdentityStep />
      </div>
    );
  }

  // Step 7: Review
  if (currentStep === 7) {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Review Configuration
          </h2>
          <p className="text-[var(--text-secondary)]">
            Preview your agent before deployment.
          </p>
        </div>

        <ReviewStep />
      </div>
    );
  }

  // Step 8: Deploy
  if (currentStep === 8) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <DeployStep />
      </div>
    );
  }

  return null;
}

// Step Components
function GoalsStep() {
  const { answers, updateAnswers } = useInterviewStore();
  const goals = [
    { id: "work", label: "Work & Professional", description: "Tasks, reports, analysis" },
    { id: "learning", label: "Learning & Education", description: "Research, tutoring, summaries" },
    { id: "creative", label: "Creative Projects", description: "Writing, design, brainstorming" },
    { id: "personal", label: "Personal Organization", description: "Scheduling, reminders, tracking" },
    { id: "entertainment", label: "Entertainment", description: "Games, recommendations, chat" },
    { id: "other", label: "Other", description: "Something else" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {goals.map((goal) => (
        <Card
          key={goal.id}
          variant={answers.goals.includes(goal.id) ? "elevated" : "default"}
          className="cursor-pointer transition-all"
          onClick={() => {
            const newGoals = answers.goals.includes(goal.id)
              ? answers.goals.filter((g) => g !== goal.id)
              : [...answers.goals, goal.id];
            updateAnswers({ goals: newGoals });
          }}
        >
          <CardHeader>
            <CardTitle className="text-lg">{goal.label}</CardTitle>
            <CardDescription>{goal.description}</CardDescription>
          </CardHeader>
          {answers.goals.includes(goal.id) && (
            <CardContent>
              <div className="text-[var(--accent-primary)] text-sm font-medium">
                ✓ Selected
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function SkillsStep() {
  const { answers, toggleSkill, addSkill, removeSkill, setLoading, setError } = useInterviewStore();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setLocalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch skills from registry
  useEffect(() => {
    async function fetchSkills() {
      try {
        setIsLoading(true);
        setLocalError(null);
        
        const response = await registryClient.getSkills({
          limit: 50,
          search: searchQuery || undefined,
        });
        
        setSkills(response.skills);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load skills";
        setLocalError(errorMessage);
        console.error("Failed to fetch skills:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSkills();
  }, [searchQuery]);

  const isSkillSelected = (skillId: string) => {
    return answers.selectedSkills.some((s) => s.id === skillId);
  };

  const handleToggleSkill = (skill: Skill) => {
    const selectedSkill: SelectedSkill = {
      id: skill.id,
      name: skill.name,
      version: skill.version,
      trustScore: skill.trustScore,
      description: skill.description,
      skillHash: skill.skillHash,
      permissions: skill.permissions,
    };

    if (isSkillSelected(skill.id)) {
      removeSkill(skill.id);
    } else {
      addSkill(selectedSkill);
    }
  };

  const getTrustScoreStyle = (score: number) => {
    if (score >= 0.8) return { color: "text-green-500", bg: "bg-green-500/10", label: "High" };
    if (score >= 0.6) return { color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Medium" };
    if (score >= 0.4) return { color: "text-orange-500", bg: "bg-orange-500/10", label: "Low" };
    return { color: "text-red-500", bg: "bg-red-500/10", label: "Very Low" };
  };

  // Filter skills based on search
  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = searchQuery === "" || 
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === null || 
      skill.categories?.some((cat) => cat.id === selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 text-[var(--accent-primary)] animate-spin mb-4" />
        <p className="text-[var(--text-secondary)]">Loading skills from registry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="p-4 rounded-full bg-red-500/10 mb-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Failed to Load Skills
        </h3>
        <p className="text-[var(--text-secondary)] mb-4 max-w-md text-center">
          {error}
        </p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search skills by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
      </div>

      {/* Selected Skills Summary */}
      {answers.selectedSkills.length > 0 && (
        <div className="p-4 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-primary)]/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {answers.selectedSkills.length} skill{answers.selectedSkills.length !== 1 ? 's' : ''} selected
              </span>
              <p className="text-xs text-[var(--text-muted)]">
                {answers.selectedSkills.map((s) => s.name).join(", ")}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => useInterviewStore.getState().updateAnswers({ selectedSkills: [] })}>
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Skills Grid */}
      {filteredSkills.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)]">No skills found matching your search.</p>
          <Button variant="ghost" className="mt-4" onClick={() => setSearchQuery("")}>
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => {
            const trustStyle = getTrustScoreStyle(skill.trustScore);
            const isSelected = isSkillSelected(skill.id);

            return (
              <Card
                key={skill.id}
                variant={isSelected ? "elevated" : "interactive"}
                className={`relative transition-all ${isSelected ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{skill.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        v{skill.version} • {skill.downloadCount.toLocaleString()} downloads
                      </CardDescription>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${trustStyle.bg} ${trustStyle.color}`}>
                      {trustStyle.label}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                    {skill.description}
                  </p>

                  {/* Trust Score Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Trust Score</span>
                      <span className={trustStyle.color}>{Math.round(skill.trustScore * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          skill.trustScore >= 0.8 ? 'bg-green-500' :
                          skill.trustScore >= 0.6 ? 'bg-yellow-500' :
                          skill.trustScore >= 0.4 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${skill.trustScore * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Categories */}
                  {skill.categories && skill.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skill.categories.slice(0, 3).map((cat) => (
                        <span
                          key={cat.id}
                          className="px-2 py-0.5 text-xs bg-[var(--surface)] text-[var(--text-muted)] rounded"
                        >
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant={isSelected ? "secondary" : "primary"}
                      className="flex-1"
                      onClick={() => handleToggleSkill(skill)}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Selected
                        </>
                      ) : (
                        "Add Skill"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`${registryClient.getDocsUrl()}/#/skills/${skill.skillHash}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty Registry State */}
      {skills.length === 0 && !isLoading && !error && (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)]">No skills available in the registry.</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Check back later or contact the registry administrator.
          </p>
        </div>
      )}
    </div>
  );
}

function PersonalityStep() {
  const { answers, updateAnswers } = useInterviewStore();

  const sliders = [
    { key: "tone", label: "Communication Style", left: "Direct", right: "Conversational" },
    { key: "verbosity", label: "Detail Level", left: "Brief", right: "Comprehensive" },
    { key: "formality", label: "Formality", left: "Casual", right: "Professional" },
  ];

  return (
    <div className="space-y-8">
      {sliders.map((slider) => (
        <div key={slider.key} className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {slider.label}
            </label>
            <span className="text-sm text-[var(--text-muted)]">
              {answers.personality[slider.key as keyof typeof answers.personality]}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={answers.personality[slider.key as keyof typeof answers.personality]}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              updateAnswers({
                personality: {
                  ...answers.personality,
                  [slider.key]: value,
                },
              });
            }}
            className="w-full h-2 bg-[var(--surface)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
          />
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>{slider.left}</span>
            <span>{slider.right}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PrivacyStep() {
  const { answers, updateAnswers } = useInterviewStore();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Privacy Level
        </label>
        <div className="grid grid-cols-3 gap-3">
          {["local", "balanced", "cloud"].map((level) => (
            <Button
              key={level}
              variant={answers.privacy === level ? "primary" : "secondary"}
              onClick={() => updateAnswers({ privacy: level as any })}
              className="w-full"
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Autonomy Level
        </label>
        <div className="space-y-2">
          {[
            { value: "confirm", label: "Ask before every action" },
            { value: "suggest", label: "Suggest actions, wait for confirmation" },
            { value: "independent", label: "Act independently within constraints" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-default)] cursor-pointer hover:bg-[var(--surface-hover)]"
            >
              <input
                type="radio"
                name="autonomy"
                value={option.value}
                checked={answers.autonomy === option.value}
                onChange={(e) => updateAnswers({ autonomy: e.target.value as any })}
                className="text-[var(--accent-primary)]"
              />
              <span className="text-sm text-[var(--text-primary)]">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function IdentityStep() {
  const { answers, updateAnswers } = useInterviewStore();
  const { address, isConnected, isConnecting, error, connect, disconnect } = useWallet();

  // Update wallet address in store when connected
  useEffect(() => {
    if (isConnected && address) {
      updateAnswers({ walletAddress: address });
    } else if (!isConnected) {
      updateAnswers({ walletAddress: undefined });
    }
  }, [isConnected, address, updateAnswers]);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Agent Name
        </label>
        <input
          type="text"
          value={answers.name}
          onChange={(e) => updateAnswers({ name: e.target.value })}
          placeholder="e.g., DataAnalyzer, CalendarAssistant"
          className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Use only letters, numbers, and hyphens. No spaces.
        </p>
      </div>

      {/* Wallet Connection Card */}
      <div className={`p-4 rounded-lg border ${isConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-[var(--accent-subtle)] border-[var(--accent-primary)]/20'}`}>
        {!isConnected ? (
          /* Not Connected State */
          <>
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-[var(--accent-primary)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Connect Wallet (Optional)
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Connect to own this agent as an NFT and access Genesis features
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={connect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect MetaMask
                </>
              )}
            </Button>
          </>
        ) : (
          /* Connected State */
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Wallet Connected
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">
                    {formatAddress(address!)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-500">Connected</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-green-500/20">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--text-secondary)]">
                  <p>✓ Genesis holder features unlocked</p>
                  <p>✓ NFT ownership enabled</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnect}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border-default)]">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
          Why connect a wallet?
        </h4>
        <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
          <li>Own your agent as an NFT on the blockchain</li>
          <li>Access exclusive Genesis holder features</li>
          <li>Publish and audit skills in the registry</li>
          <li>Completely optional - skip if you prefer</li>
        </ul>
      </div>
    </div>
  );
}

function ReviewStep() {
  const { answers } = useInterviewStore();

  const getTrustScoreStyle = (score: number) => {
    if (score >= 0.8) return { color: "text-green-500", bg: "bg-green-500/10", label: "High" };
    if (score >= 0.6) return { color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Medium" };
    if (score >= 0.4) return { color: "text-orange-500", bg: "bg-orange-500/10", label: "Low" };
    return { color: "text-red-500", bg: "bg-red-500/10", label: "Very Low" };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-[var(--text-muted)]">Name:</span>
              <p className="font-medium">{answers.name || "Not set"}</p>
            </div>
            <div>
              <span className="text-sm text-[var(--text-muted)]">Goals:</span>
              <p className="font-medium">{answers.goals.join(", ") || "None selected"}</p>
            </div>
            <div>
              <span className="text-sm text-[var(--text-muted)]">Selected Skills:</span>
              {answers.selectedSkills.length === 0 ? (
                <p className="text-[var(--text-muted)] italic">No skills selected</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {answers.selectedSkills.map((skill) => {
                    const trustStyle = getTrustScoreStyle(skill.trustScore);
                    return (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between p-2 bg-[var(--surface)] rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{skill.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">v{skill.version}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${trustStyle.bg} ${trustStyle.color}`}>
                          {Math.round(skill.trustScore * 100)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <span className="text-sm text-[var(--text-muted)]">Personality:</span>
              <div className="mt-1 space-y-1 text-sm">
                <p>Tone: {answers.personality.tone}%</p>
                <p>Verbosity: {answers.personality.verbosity}%</p>
                <p>Formality: {answers.personality.formality}%</p>
              </div>
            </div>
            <div>
              <span className="text-sm text-[var(--text-muted)]">Privacy:</span>
              <p className="font-medium capitalize">{answers.privacy}</p>
            </div>
            <div>
              <span className="text-sm text-[var(--text-muted)]">Autonomy:</span>
              <p className="font-medium capitalize">{answers.autonomy}</p>
            </div>
            <div>
              <span className="text-sm text-[var(--text-muted)]">Wallet:</span>
              {answers.walletAddress ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <p className="font-medium text-sm font-mono">{formatAddress(answers.walletAddress)}</p>
                </div>
              ) : (
                <p className="text-[var(--text-muted)] italic">Not connected</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Button variant="secondary" className="w-full">
          Edit Configuration
        </Button>
      </div>

      <div>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Generated JSON</CardTitle>
            <CardDescription>Preview and edit agent configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <MonacoEditor
              value={JSON.stringify({
                agent: {
                  name: answers.name,
                  goals: answers.goals,
                  skills: answers.selectedSkills.map((s) => ({
                    name: s.name,
                    version: s.version,
                    trustScore: s.trustScore,
                    hash: s.skillHash,
                  })),
                  personality: answers.personality,
                  autonomy: answers.autonomy,
                  privacy: answers.privacy,
                  owner: answers.walletAddress ? {
                    address: answers.walletAddress,
                    type: "ethereum"
                  } : null,
                },
              }, null, 2)}
              height="400px"
              readOnly={true}
              language="json"
              theme="vs-dark"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DeployStep() {
  const { complete } = useInterviewStore();

  return (
    <div className="py-12">
      <div className="mb-8 p-6 rounded-full bg-[var(--color-success)]/10 inline-block">
        <Sparkles className="w-16 h-16 text-[var(--color-success)]" />
      </div>
      
      <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
        Your Agent is Ready!
      </h2>
      
      <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
        Choose how you want to deploy your agent. You can change this later.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
        <Card variant="interactive">
          <CardHeader>
            <CardTitle className="text-lg">Web Agent</CardTitle>
            <CardDescription>Run in browser</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="w-full" onClick={complete}>
              Deploy
            </Button>
          </CardContent>
        </Card>

        <Card variant="interactive">
          <CardHeader>
            <CardTitle className="text-lg">Desktop</CardTitle>
            <CardDescription>Download app</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="w-full" onClick={complete}>
              Download
            </Button>
          </CardContent>
        </Card>

        <Card variant="interactive">
          <CardHeader>
            <CardTitle className="text-lg">API</CardTitle>
            <CardDescription>HTTP endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="w-full" onClick={complete}>
              Get Key
            </Button>
          </CardContent>
        </Card>
      </div>

      <Button variant="ghost" onClick={() => window.location.href = "/"}>
        ← Back to Home
      </Button>
    </div>
  );
}
