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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="mb-6 p-4 rounded-full bg-blue-500/10">
          <Sparkles className="w-12 h-12 text-blue-500" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Create Your AI Agent
        </h1>
        
        <p className="text-lg text-gray-400 max-w-2xl mb-8">
          Answer a few questions about your goals and preferences. We&apos;ll help you 
          configure a custom agent with verified skills from the registry.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl w-full">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <Zap className="w-8 h-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Quick Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                7 simple steps, takes about 5 minutes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <Shield className="w-8 h-8 text-green-500 mb-2" />
              <CardTitle className="text-lg">Verified Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                All skills audited and scored for trust
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <Wallet className="w-8 h-8 text-yellow-500 mb-2" />
              <CardTitle className="text-lg">You Own It</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
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

        <p className="mt-6 text-sm text-gray-500">
          Pro Tip: Connect your wallet to access Genesis holder features
        </p>
      </div>
    );
  }

  // Step 2: Goals
  if (currentStep === 2) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            What will your agent do?
          </h2>
          <p className="text-gray-400">
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
      <div className="px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Select Skills
          </h2>
          <p className="text-gray-400">
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Configure Behavior
          </h2>
          <p className="text-gray-400">
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Privacy & Constraints
          </h2>
          <p className="text-gray-400">
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Name Your Agent
          </h2>
          <p className="text-gray-400">
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
      <div className="px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Review Configuration
          </h2>
          <p className="text-gray-400">
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
      <div className="max-w-2xl mx-auto text-center px-4">
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
          className={`cursor-pointer transition-all ${
            answers.goals.includes(goal.id) 
              ? 'bg-gray-800 border-blue-500 ring-2 ring-blue-500' 
              : 'bg-gray-900 border-gray-800 hover:border-gray-700'
          }`}
          onClick={() => {
            const newGoals = answers.goals.includes(goal.id)
              ? answers.goals.filter((g) => g !== goal.id)
              : [...answers.goals, goal.id];
            updateAnswers({ goals: newGoals });
          }}
        >
          <CardHeader>
            <CardTitle className="text-lg text-white">{goal.label}</CardTitle>
            <CardDescription className="text-gray-400">{goal.description}</CardDescription>
          </CardHeader>
          {answers.goals.includes(goal.id) && (
            <CardContent>
              <div className="text-blue-400 text-sm font-medium">
                ✓ Selected
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

// Mock skills for fallback when API is unavailable
const MOCK_SKILLS: Skill[] = [
  {
    id: "1",
    skillHash: "weather-api-v1",
    name: "Weather Lookup",
    version: "1.0.0",
    description: "Get current weather and forecasts for any location worldwide. Supports multiple weather providers.",
    publisherAddress: "0x11B3EfbF04F0bA505F380aC20444B6952970AdA6",
    trustScore: 0.92,
    downloadCount: 15420,
    isBlocked: false,
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-02-01T00:00:00Z",
    permissions: {
      network: {
        domains: ["api.openweathermap.org", "api.weatherapi.com"]
      }
    },
    categories: [{ id: "utility", name: "Utility" }],
    tags: [{ id: "weather", name: "weather" }, { id: "api", name: "api" }]
  },
  {
    id: "2",
    skillHash: "crypto-price-v1",
    name: "Crypto Price Tracker",
    version: "1.2.0",
    description: "Track cryptocurrency prices, market cap, and trading volume in real-time. Supports 1000+ coins.",
    publisherAddress: "0x11B3EfbF04F0bA505F380aC20444B6952970AdA6",
    trustScore: 0.88,
    downloadCount: 8930,
    isBlocked: false,
    createdAt: "2024-01-20T00:00:00Z",
    updatedAt: "2024-02-05T00:00:00Z",
    permissions: {
      network: {
        domains: ["api.coingecko.com", "api.binance.com"]
      }
    },
    categories: [{ id: "finance", name: "Finance" }],
    tags: [{ id: "crypto", name: "crypto" }, { id: "finance", name: "finance" }]
  },
  {
    id: "3",
    skillHash: "data-processor-v1",
    name: "Data Processor",
    version: "2.0.1",
    description: "Process and transform JSON, CSV, and XML data. Includes filtering, mapping, and aggregation functions.",
    publisherAddress: "0x11B3EfbF04F0bA505F380aC20444B6952970AdA6",
    trustScore: 0.95,
    downloadCount: 32100,
    isBlocked: false,
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-02-10T00:00:00Z",
    permissions: {
      filesystem: {
        read: ["/data/input"],
        write: ["/data/output"]
      }
    },
    categories: [{ id: "data", name: "Data Processing" }],
    tags: [{ id: "data", name: "data" }, { id: "json", name: "json" }]
  },
  {
    id: "4",
    skillHash: "web-scraper-v1",
    name: "Web Scraper",
    version: "1.0.5",
    description: "Extract data from websites using CSS selectors. Respects robots.txt and rate limits.",
    publisherAddress: "0x11B3EfbF04F0bA505F380aC20444B6952970AdA6",
    trustScore: 0.75,
    downloadCount: 5600,
    isBlocked: false,
    createdAt: "2024-01-25T00:00:00Z",
    updatedAt: "2024-02-08T00:00:00Z",
    permissions: {
      network: {
        domains: ["*"]
      }
    },
    categories: [{ id: "automation", name: "Automation" }],
    tags: [{ id: "scraper", name: "scraper" }, { id: "web", name: "web" }]
  },
  {
    id: "5",
    skillHash: "email-sender-v1",
    name: "Email Sender",
    version: "1.1.0",
    description: "Send emails via SMTP or email APIs. Supports templates and attachments.",
    publisherAddress: "0x11B3EfbF04F0bA505F380aC20444B6952970AdA6",
    trustScore: 0.85,
    downloadCount: 12300,
    isBlocked: false,
    createdAt: "2024-01-18T00:00:00Z",
    updatedAt: "2024-02-03T00:00:00Z",
    permissions: {
      network: {
        domains: ["smtp.gmail.com", "api.sendgrid.com", "api.mailgun.net"]
      }
    },
    categories: [{ id: "communication", name: "Communication" }],
    tags: [{ id: "email", name: "email" }, { id: "smtp", name: "smtp" }]
  },
  {
    id: "6",
    skillHash: "calendar-sync-v1",
    name: "Calendar Sync",
    version: "1.0.2",
    description: "Sync with Google Calendar, Outlook, and Apple Calendar. Create events and check availability.",
    publisherAddress: "0x11B3EfbF04F0bA505F380aC20444B6952970AdA6",
    trustScore: 0.90,
    downloadCount: 18700,
    isBlocked: false,
    createdAt: "2024-01-12T00:00:00Z",
    updatedAt: "2024-02-06T00:00:00Z",
    permissions: {
      network: {
        domains: ["www.googleapis.com", "graph.microsoft.com"]
      }
    },
    categories: [{ id: "productivity", name: "Productivity" }],
    tags: [{ id: "calendar", name: "calendar" }, { id: "sync", name: "sync" }]
  }
];

function SkillsStep() {
  const { answers, addSkill, removeSkill } = useInterviewStore();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setLocalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
        console.error("Failed to fetch skills from API:", err);
        // Use mock skills as fallback
        console.log("Using mock skills as fallback");
        setSkills(MOCK_SKILLS);
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
    
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-400">Loading skills from registry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="p-4 rounded-full bg-red-500/10 mb-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Failed to Load Skills
        </h3>
        <p className="text-gray-400 mb-4 max-w-md text-center">
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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search skills by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Selected Skills Summary */}
      {answers.selectedSkills.length > 0 && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-white">
                {answers.selectedSkills.length} skill{answers.selectedSkills.length !== 1 ? 's' : ''} selected
              </span>
              <p className="text-xs text-gray-400">
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
          <p className="text-gray-500">No skills found matching your search.</p>
          <Button variant="secondary" className="mt-4" onClick={() => setSearchQuery("")}>
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
                className={`relative transition-all ${
                  isSelected 
                    ? 'bg-gray-800 border-blue-500 ring-2 ring-blue-500' 
                    : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Trust Score Badge */}
                <div className="absolute top-3 right-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${trustStyle.bg} ${trustStyle.color}`}>
                    {trustStyle.label} ({Math.round(skill.trustScore * 100)}%)
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white pr-20">{skill.name}</CardTitle>
                  <CardDescription className="text-gray-400 text-sm line-clamp-2">
                    {skill.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Trust Score Bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Trust Score</span>
                      <span className={trustStyle.color}>{Math.round(skill.trustScore * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
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
                      {skill.categories.slice(0, 3).map((cat, index) => (
                        <span
                          key={`${skill.id}-cat-${cat.id || index}`}
                          className="px-2 py-0.5 text-xs bg-gray-800 text-gray-400 rounded"
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonalityStep() {
  const { answers, updateAnswers } = useInterviewStore();
  
  const sliders = [
    { 
      id: "creativity", 
      label: "Creativity", 
      description: "How creative vs analytical should responses be?",
      left: "Analytical",
      right: "Creative"
    },
    { 
      id: "formality", 
      label: "Formality", 
      description: "How formal should the tone be?",
      left: "Casual",
      right: "Formal"
    },
    { 
      id: "verbosity", 
      label: "Verbosity", 
      description: "How detailed should responses be?",
      left: "Concise",
      right: "Detailed"
    },
  ];

  return (
    <div className="space-y-8">
      {sliders.map((slider) => (
        <div key={slider.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="mb-4">
            <label className="text-lg font-medium text-white block mb-1">
              {slider.label}
            </label>
            <p className="text-sm text-gray-400">{slider.description}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 w-20 text-right">{slider.left}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={answers.personality[slider.id as keyof typeof answers.personality]}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                updateAnswers({
                  personality: {
                    ...answers.personality,
                    [slider.id]: value,
                  },
                });
              }}
              className="flex-1 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-sm text-gray-500 w-20">{slider.right}</span>
          </div>
          
          <div className="text-center mt-2">
            <span className="text-sm text-blue-400">
              {answers.personality[slider.id as keyof typeof answers.personality]}%
            </span>
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
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Data Sharing Level</CardTitle>
          <CardDescription className="text-gray-400">
            Control how much data your agent can access and share
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {["local", "balanced", "cloud"].map((level) => (
            <label
              key={level}
              className={`flex items-center p-4 rounded-lg cursor-pointer transition-all ${
                answers.privacyLevel === level
                  ? 'bg-blue-500/10 border border-blue-500'
                  : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="privacy"
                value={level}
                checked={answers.privacyLevel === level}
                onChange={() => updateAnswers({ privacyLevel: level as "local" | "balanced" | "cloud" })}
                className="sr-only"
              />
              <div className="flex-1">
                <p className="font-medium text-white capitalize">{level}</p>
                <p className="text-sm text-gray-400">
                  {level === "local" && "All processing happens on your device only"}
                  {level === "balanced" && "Some data shared for better performance"}
                  {level === "cloud" && "Full cloud features enabled"}
                </p>
              </div>
              {answers.privacyLevel === level && (
                <Check className="w-5 h-5 text-blue-500" />
              )}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Content Boundaries</CardTitle>
          <CardDescription className="text-gray-400">
            Set limits on what topics your agent will discuss
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={answers.contentBoundaries}
            onChange={(e) => updateAnswers({ contentBoundaries: e.target.value })}
            placeholder="E.g., Avoid discussing medical advice, financial investments, or personal relationships..."
            rows={4}
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function IdentityStep() {
  const { answers, updateAnswers } = useInterviewStore();
  const { address, isConnected, isConnecting, error: walletError, connect, disconnect } = useWallet();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Agent Name */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Agent Name</CardTitle>
          <CardDescription className="text-gray-400">
            Give your agent a unique name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            value={answers.agentName}
            onChange={(e) => updateAnswers({ agentName: e.target.value })}
            placeholder="e.g., My Personal Assistant"
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
          />
        </CardContent>
      </Card>

      {/* Wallet Connection */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Connect Wallet (Optional)</CardTitle>
          <CardDescription className="text-gray-400">
            Connect your wallet to own this agent configuration as an NFT
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="text-center py-4">
              <Button
                onClick={connect}
                disabled={isConnecting}
                className="w-full"
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
              {walletError && (
                <p className="text-red-500 text-sm mt-2">{walletError}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div>
                  <p className="text-sm text-gray-400">Connected Wallet</p>
                  <p className="font-mono text-white">{formatAddress(address!)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-green-500">Connected</span>
                </div>
              </div>
              
              <Button variant="secondary" onClick={disconnect} className="w-full">
                Disconnect Wallet
              </Button>
            </div>
          )}

          <div className="text-sm text-gray-500 bg-gray-800/50 p-4 rounded-lg">
            <p className="font-medium text-gray-400 mb-2">Benefits of connecting:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Own your agent as an NFT</li>
              <li>Access Genesis holder features</li>
              <li>Deploy to blockchain</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStep() {
  const { answers } = useInterviewStore();
  const { address, isConnected } = useWallet();

  const agentConfig = {
    name: answers.agentName || "My Agent",
    version: "1.0.0",
    goals: answers.goals,
    personality: answers.personality,
    privacyLevel: answers.privacyLevel,
    contentBoundaries: answers.contentBoundaries,
    skills: answers.selectedSkills.map((s) => ({
      id: s.id,
      name: s.name,
      version: s.version,
      trustScore: s.trustScore,
    })),
    walletAddress: address || null,
    createdAt: new Date().toISOString(),
  };

  const configJson = JSON.stringify(agentConfig, null, 2);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Agent Name</p>
              <p className="text-white font-medium">{answers.agentName || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Goals</p>
              <p className="text-white">{answers.goals.length} selected</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Skills</p>
              <p className="text-white">{answers.selectedSkills.length} selected</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Privacy Level</p>
              <p className="text-white capitalize">{answers.privacyLevel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Wallet</p>
              <p className="text-white">{isConnected ? formatAddress(address!) : "Not connected"}</p>
            </div>
          </div>

          {answers.selectedSkills.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Selected Skills:</p>
              <div className="flex flex-wrap gap-2">
                {answers.selectedSkills.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-sm"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* JSON Preview */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">JSON Configuration</CardTitle>
            <CardDescription className="text-gray-400">
              Preview your agent configuration
            </CardDescription>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(configJson);
            }}
          >
            Copy JSON
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-96 border border-gray-800 rounded-lg overflow-hidden">
            <MonacoEditor
              value={configJson}
              language="json"
              readOnly={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DeployStep() {
  const { answers, resetInterview } = useInterviewStore();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const handleDeploy = async () => {
    setIsDeploying(true);
    // Simulate deployment
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsDeploying(false);
    setDeployed(true);
  };

  if (deployed) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg">
          <h2 className="text-2xl font-bold text-green-400 mb-2">Success!</h2>
          <p className="text-gray-300">Your agent has been configured successfully.</p>
        </div>

        <div className="space-y-4">
          <p className="text-gray-400">What would you like to do next?</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => window.location.href = "/"}>
              Return to Home
            </Button>
            <Button variant="secondary" onClick={resetInterview}>
              Create Another Agent
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-4">Ready to Deploy</h2>
        <p className="text-gray-400 mb-6">
          Your agent configuration is complete. Click deploy to finalize.
        </p>

        <div className="space-y-4 mb-6 text-left">
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Agent Name</span>
            <span className="text-white">{answers.agentName || "My Agent"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Goals</span>
            <span className="text-white">{answers.goals.length} selected</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Skills</span>
            <span className="text-white">{answers.selectedSkills.length} selected</span>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={handleDeploy}
          disabled={isDeploying}
        >
          {isDeploying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Deploying...
            </>
          ) : (
            "Deploy Agent"
          )}
        </Button>
      </div>
    </div>
  );
}
