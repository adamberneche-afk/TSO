import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
   ArrowLeft, 
   Code, 
   Terminal, 
   Package, 
   BookOpen, 
   Settings, 
   Plus, 
   ChevronRight,
   Loader2,
   AlertCircle,
   CheckCircle2,
   XCircle,
   Clock,
   Target,
   Lightbulb,
   Shield,
   Zap
 } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '../../hooks/useWallet';
import { useLLMSettings } from '../../hooks/useLLMSettings';
import { LLMClient } from '../../services/llmClient';
import { configApi } from '../../services/configApi';
import { authApi } from '../../services/authApi';
import { api } from '../../api/client';

interface CTOProject {
  id: string;
  name: string;
  description?: string;
  currentPhase: string;
  createdAt: string;
  updatedAt: string;
}

interface CTOInsight {
  id: string;
  title: string;
  content: string;
  category: 'value-prop' | 'customer-pain' | 'technical' | 'architecture' | 'lessons-learned';
  walletAddress: string;
  upvotes: number;
  createdAt: string;
  isPublic: boolean;
  status: 'draft' | 'pending_review' | 'published';
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  updated_at: string;
  html_url: string;
}

interface GoldTierDashboardProps {
  onBack: () => void;
}

export function GoldTierDashboard({ onBack }: GoldTierDashboardProps) {
  const { address, isConnected, hasGenesisNFT } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'cto' | 'knowledge' | 'sdk'>('overview');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isConnected && !hasGenesisNFT) {
      setIsVerifying(true);
      toast.info('Verifying Genesis NFT ownership...');
      setTimeout(() => setIsVerifying(false), 2000);
    }
  }, [isConnected, hasGenesisNFT]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-6 text-[#888888] hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="bg-[#141415] border-[#333333]">
            <CardHeader className="text-center py-12">
              <Shield className="w-16 h-16 text-[#3B82F6] mx-auto mb-4" />
              <CardTitle className="text-2xl">Gold Tier Access Required</CardTitle>
              <CardDescription className="text-[#888888] mt-2">
                Connect your wallet with a Genesis NFT to access premium features
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <div className="bg-[#1a1a1a] rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-[#A1A1A1]">
                  This area is exclusive to THINK Genesis Bundle NFT holders.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!hasGenesisNFT && !isVerifying) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-6 text-[#888888] hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="bg-[#141415] border-[#333333]">
            <CardHeader className="text-center py-12">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Genesis NFT Required</CardTitle>
              <CardDescription className="text-[#888888] mt-2">
                You need a THINK Genesis Bundle NFT to access Gold Tier features
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <div className="bg-[#1a1a1a] rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-[#A1A1A1] mb-4">
                  Current wallet: <span className="font-mono text-[#3B82F6]">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </p>
                <p className="text-xs text-[#666666]">
                  No Genesis NFT found for this wallet
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-6 text-[#888888] hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="bg-[#141415] border-[#333333]">
            <CardHeader className="text-center py-12">
              <Loader2 className="w-16 h-16 text-[#3B82F6] mx-auto mb-4 animate-spin" />
              <CardTitle className="text-2xl">Verifying NFT Ownership...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-[#333333] bg-[#111111] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="text-[#888888] hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#FFD700]" />
                Gold Tier Dashboard
              </h1>
              <p className="text-xs text-[#888888]">Exclusive features for Genesis NFT holders</p>
            </div>
          </div>
          <Badge variant="outline" className="border-[#FFD700] text-[#FFD700]">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
            className={activeTab === 'overview' ? 'bg-[#3B82F6]' : 'border-[#333333] text-[#888888]'}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'cto' ? 'default' : 'outline'}
            onClick={() => setActiveTab('cto')}
            className={activeTab === 'cto' ? 'bg-[#3B82F6]' : 'border-[#333333] text-[#888888]'}
          >
            <Target className="w-4 h-4 mr-2" />
            CTO Agent
          </Button>
          <Button
            variant={activeTab === 'knowledge' ? 'default' : 'outline'}
            onClick={() => setActiveTab('knowledge')}
            className={activeTab === 'knowledge' ? 'bg-[#3B82F6]' : 'border-[#333333] text-[#888888]'}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Knowledge Base
          </Button>
          <Button
            variant={activeTab === 'sdk' ? 'default' : 'outline'}
            onClick={() => setActiveTab('sdk')}
            className={activeTab === 'sdk' ? 'bg-[#3B82F6]' : 'border-[#333333] text-[#888888]'}
          >
            <Code className="w-4 h-4 mr-2" />
            SDK & CLI
          </Button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#141415] border-[#333333] hover:border-[#3B82F6]/50 transition-colors cursor-pointer" onClick={() => setActiveTab('cto')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Target className="w-10 h-10 text-[#3B82F6]" />
                  <ChevronRight className="w-5 h-5 text-[#666666]" />
                </div>
                <CardTitle className="text-white">CTO Agent</CardTitle>
                <CardDescription className="text-[#888888]">
                  Your personal app development partner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#A1A1A1]">
                  Track projects through 5 phases: planning, architecture, development, testing, launch.
                  Get AI-powered guidance for building production applications.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#141415] border-[#333333] hover:border-[#3B82F6]/50 transition-colors cursor-pointer" onClick={() => setActiveTab('sdk')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Code className="w-10 h-10 text-[#10B981]" />
                  <ChevronRight className="w-5 h-5 text-[#666666]" />
                </div>
                <CardTitle className="text-white">RAG SDK</CardTitle>
                <CardDescription className="text-[#888888]">
                  Build with TAIS in your own apps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#A1A1A1]">
                  TypeScript SDK for integrating secure, encrypted RAG into your applications.
                  Includes E2EE encryption utilities.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#141415] border-[#333333]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Terminal className="w-10 h-10 text-[#8B5CF6]" />
                  <Badge variant="outline" className="border-[#8B5CF6] text-[#8B5CF6]">Coming Soon</Badge>
                </div>
                <CardTitle className="text-white">SDK Assistant CLI</CardTitle>
                <CardDescription className="text-[#888888]">
                  Command-line development tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#A1A1A1]">
                  Interactive CLI for initializing integrations, testing APIs, and managing configurations.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#141415] border-[#333333]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Package className="w-10 h-10 text-[#F59E0B]" />
                  <Badge variant="outline" className="border-[#F59E0B] text-[#F59E0B]">50KB</Badge>
                </div>
                <CardTitle className="text-white">Increased Limits</CardTitle>
                <CardDescription className="text-[#888888]">
                  Gold tier benefits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-[#A1A1A1] space-y-1">
                  <li>• 50KB personality (vs 5KB free)</li>
                  <li>• Unlimited agent configurations</li>
                  <li>• Version history (90 days, 100 versions)</li>
                  <li>• SDK API access</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'cto' && (
          <CTOAgentSection address={address || ''} />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBaseSection address={address || ''} />
        )}

        {activeTab === 'sdk' && (
          <SDKSection />
        )}
      </div>
    </div>
  );
}

function KnowledgeBaseSection({ address }: { address: string }) {
  const [insights, setInsights] = useState<CTOInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInsight, setNewInsight] = useState({ title: '', content: '', category: 'lessons-learned' as const });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
    // Check if the address is the deployer/admin address from environment or known contract
    const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase() || '0x000000000000000000000000000000000000dead';
    const isAdmin = address?.toLowerCase() === adminAddress;

  useEffect(() => {
    loadInsights();
  }, []);

   const loadInsights = async () => {
     setIsLoading(true);
     try {
       const data = await api.get<any>('/api/v1/cto/insights');
       setInsights(data.insights || []);
     } catch (error) {
       console.error('Failed to load insights:', error);
     } finally {
       setIsLoading(false);
     }
   };

   const submitInsight = async () => {
     if (!newInsight.title.trim() || !newInsight.content.trim()) return;
     setIsSubmitting(true);
     try {
       const data = await api.post<any>('/api/v1/cto/insights', {
         data: { ...newInsight, walletAddress: address }
       });
       toast.success('Insight saved to knowledge base!');
       setShowAddForm(false);
       setNewInsight({ title: '', content: '', category: 'lessons-learned' });
       loadInsights();
     } catch (error) {
       console.error('Failed to save insight:', error);
       toast.error('Failed to save insight');
     } finally {
       setIsSubmitting(false);
     }
   };

  const categoryColors: Record<string, string> = {
    'value-prop': 'bg-blue-500',
    'customer-pain': 'bg-red-500',
    'technical': 'bg-purple-500',
    'architecture': 'bg-yellow-500',
    'lessons-learned': 'bg-green-500',
  };

  const categoryLabels: Record<string, string> = {
    'value-prop': 'Value Proposition',
    'customer-pain': 'Customer Pain Points',
    'technical': 'Technical Decisions',
    'architecture': 'Architecture',
    'lessons-learned': 'Lessons Learned',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Community Knowledge Base</h2>
          <p className="text-sm text-[#888888]">Insights and lessons from the CTO Agent conversations</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-[#3B82F6] hover:bg-[#2563EB]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Insight
        </Button>
      </div>

      {showAddForm && (
        <Card className="bg-[#141415] border-[#333333]">
          <CardHeader>
            <CardTitle className="text-white">Share an Insight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-[#888888] uppercase tracking-wider">Title</label>
              <Input
                value={newInsight.title}
                onChange={(e) => setNewInsight({ ...newInsight, title: e.target.value })}
                placeholder="What did you learn?"
                className="bg-[#1a1a1a] border-[#333333] text-white mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-[#888888] uppercase tracking-wider">Category</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <Badge
                    key={key}
                    className={`${newInsight.category === key ? categoryColors[key] : 'bg-[#333333]'} text-white cursor-pointer`}
                    onClick={() => setNewInsight({ ...newInsight, category: key as any })}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#888888] uppercase tracking-wider">Insight</label>
              <Textarea
                value={newInsight.content}
                onChange={(e) => setNewInsight({ ...newInsight, content: e.target.value })}
                placeholder="Share your knowledge..."
                rows={4}
                className="bg-[#1a1a1a] border-[#333333] text-white mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={submitInsight} disabled={isSubmitting} className="bg-[#3B82F6]">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save to Community'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="border-[#333333] text-white">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {insights.length === 0 ? (
          <Card className="bg-[#141415] border-[#333333]">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-[#555555] mx-auto mb-4" />
              <p className="text-[#888888]">No insights yet</p>
              <p className="text-xs text-[#666666] mt-1">Be the first to share knowledge with the community</p>
            </CardContent>
          </Card>
        ) : (
          insights.map((insight) => (
            <Card key={insight.id} className="bg-[#141415] border-[#333333]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`${categoryColors[insight.category]} text-white text-xs`}>
                        {categoryLabels[insight.category]}
                      </Badge>
                      <span className="text-xs text-[#666666]">
                        {new Date(insight.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-medium text-white">{insight.title}</h4>
                    <p className="text-sm text-[#A1A1A1] mt-2 whitespace-pre-wrap">{insight.content}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[#666666]">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs">{insight.upvotes}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function CTOAgentSection({ address }: { address: string }) {
  const [projects, setProjects] = useState<CTOProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // GitHub state
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [repoContents, setRepoContents] = useState<string>('');
  const apiKeyCache = useRef<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  
  // Chat state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const { selectedProvider, customBaseUrl } = useLLMSettings();

  useEffect(() => {
    loadProjects();
    loadGitHubConnection();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadGitHubConnection = async () => {
    // Check if GitHub is connected
    const encodedToken = localStorage.getItem('github_token');
    if (encodedToken) {
      try {
        // Decode token (in production, decrypt properly)
        const decoded = atob(encodedToken);
        const token = decoded.split(':')[0]; // Get just the token part
        
        setGithubToken(encodedToken);
        setGithubConnected(true);
        await loadGitHubRepos(token);
      } catch (e) {
        console.error('Failed to load GitHub token:', e);
        localStorage.removeItem('github_token');
      }
    }
  };

    const loadGitHubRepos = async (token: string) => {
      try {
        const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=20&affiliation=owner,collaborator,organization_member', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (response.ok) {
          const repos: GitHubRepo[] = await response.json();
          setGithubRepos(repos);
        } else if (response.status === 401) {
          // Token expired, clear it
          localStorage.removeItem('github_token');
          setGithubConnected(false);
          toast.error('GitHub token expired. Please reconnect.');
        }
      } catch (error) {
        console.error('Failed to load GitHub repos:', error);
      }
    };

  const connectGitHub = async () => {
    setIsConnectingGithub(true);
    
    // Store wallet address for token association
    localStorage.setItem('pending_github_wallet', address);
    
    // Generate state for security
    const state = crypto.randomUUID();
    sessionStorage.setItem('github_oauth_state', state);
    
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || 'YOUR_GITHUB_CLIENT_ID';
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const scope = 'repo read:user';
    
    // Open OAuth in popup
    const width = 600;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    
    const authWindow = window.open(
      authUrl,
      'GitHub OAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Listen for OAuth completion
    const checkClosed = setInterval(() => {
      if (authWindow?.closed) {
        clearInterval(checkClosed);
        
        // Verify state to prevent CSRF
        const storedState = sessionStorage.getItem('github_oauth_state');
        if (storedState !== state) {
          setIsConnectingGithub(false);
          toast.error('OAuth state mismatch - please try again');
          return;
        }
        
        // Check for token
        const encodedToken = localStorage.getItem('github_token');
        if (encodedToken) {
          try {
            // Decode token (in production, decrypt properly)
            const decoded = atob(encodedToken);
            const token = decoded.split(':')[0];
            
            setGithubToken(encodedToken);
            setGithubConnected(true);
            loadGitHubRepos(token);
            toast.success('GitHub connected!');
          } catch (e) {
            console.error('Failed to decode token:', e);
            toast.error('Failed to parse GitHub token');
          }
        }
        setIsConnectingGithub(false);
      }
    }, 500);
  };

  const disconnectGitHub = () => {
    localStorage.removeItem('github_token');
    localStorage.removeItem('pending_github_wallet');
    sessionStorage.removeItem('github_oauth_state');
    setGithubToken(null);
    setGithubConnected(false);
    setGithubRepos([]);
    setSelectedRepo(null);
    setRepoContents('');
    apiKeyCache.current = null;
    toast.success('GitHub disconnected');
  };

  const fetchRepoContents = async (repo: GitHubRepo, token: string) => {
    try {
      // Fetch repo tree
      const treeResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/git/trees/main?recursive=1`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
      });
      
      if (!treeResponse.ok) {
        // Try master branch
        const masterResponse = await fetch(`https://api.github.com/repos/${repo.full_name}/git/trees/master?recursive=1`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
        });
        if (!masterResponse.ok) return '';
        const masterData = await masterResponse.json();
        return await fetchKeyFiles(repo.full_name, token, masterData.tree.slice(0, 50));
      }
      
      const data = await treeResponse.json();
      // Get top files (limit to avoid hitting rate limits)
      return await fetchKeyFiles(repo.full_name, token, data.tree.slice(0, 50));
    } catch (error) {
      console.error('Failed to fetch repo contents:', error);
      return '';
    }
  };

  const fetchKeyFiles = async (fullName: string, token: string, tree: any[]) => {
    const keyFiles = tree.filter((f: any) => 
      f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.js') || f.path.endsWith('.json')
    ).slice(0, 10);
    
    const contents: string[] = [];
    for (const file of keyFiles) {
      try {
        const response = await fetch(`https://api.github.com/repos/${fullName}/contents/${file.path}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3.raw' },
        });
        if (response.ok) {
          const content = await response.text();
          contents.push(`\n\n=== ${file.path} ===\n${content.substring(0, 3000)}`);
        }
      } catch (e) {}
    }
    return contents.join('\n');
  };

  const handleRepoSelect = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    if (githubToken) {
      const decoded = atob(githubToken);
      const token = decoded.split(':')[0];
      toast.info('Fetching repo code...');
      const contents = await fetchRepoContents(repo, token);
      setRepoContents(contents);
      toast.success('Code loaded!');
    }
  };

   const loadProjects = async () => {
     if (!address) return;
     setIsLoading(true);
     try {
       const data = await api.get<any>(`/api/v1/cto/projects?wallet=${address}`);
       setProjects(data.projects || []);
     } catch (error) {
       console.error('Failed to load CTO projects:', error);
     } finally {
       setIsLoading(false);
     }
   };

    const createProject = async () => {
      if (!newProjectName.trim() || !address) return;
      setIsCreating(true);
      try {
        const data = await api.post<any>(`/api/v1/cto/projects`, {
          data: {
            wallet: address,
            name: newProjectName,
            description: newProjectDesc
          }
        });
        toast.success('Project created!');
        setNewProjectName('');
        setNewProjectDesc('');
        loadProjects();
      } catch (error) {
        console.error('Failed to create project:', error);
        toast.error(error.message || 'Failed to create project');
      } finally {
        setIsCreating(false);
      }
    };

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      planning: 'bg-blue-500',
      architecture: 'bg-purple-500',
      development: 'bg-yellow-500',
      testing: 'bg-orange-500',
      launch: 'bg-green-500',
    };
    return colors[phase] || 'bg-gray-500';
  };

  const getPhaseProgress = (phase: string) => {
    const phases = ['planning', 'architecture', 'development', 'testing', 'launch'];
    return ((phases.indexOf(phase) + 1) / 5) * 100;
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting || !selectedProvider) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatting(true);
    
    try {
       // Use cached API key or get from wallet
       let apiKey = apiKeyCache.current;
       
       if (!apiKey) {
         // Check ethereum availability immediately before use to prevent race conditions
         if (typeof window.ethereum === 'undefined') {
           throw new Error('MetaMask not available');
         }
         
         try {
           const { providers } = await import('ethers');
           const ethProvider = new providers.Web3Provider(window.ethereum);
           const signer = await ethProvider.getSigner();
           
           const { getDecryptedApiKey } = await import('../../services/apiKeyManager');
           apiKey = await getDecryptedApiKey(selectedProvider, signer);
           
           if (!apiKey) {
             throw new Error('No API key found. Configure in Settings.');
           }
           
           // Cache the API key for subsequent requests
           apiKeyCache.current = apiKey;
         } catch (error) {
           // Handle case where user disconnected MetaMask during the process
           if (error.message.includes('MetaMask not available')) {
             throw error;
           }
           throw new Error('Failed to connect to wallet. Please try again.');
         }
       }
      
      const llmClient = new LLMClient(selectedProvider, apiKey, customBaseUrl);
      const project = projects.find(p => p.id === selectedProjectId);
      
      const projectContext = project ? `Project: ${project.name}${project.description ? ' - ' + project.description : ''}` : '';
      const repoContext = selectedRepo && repoContents 
        ? `\n\n=== REPO CODE (${selectedRepo.full_name}) ===\n${repoContents.substring(0, 8000)}\n=== END REPO CODE ===` 
        : '';
      
      const ctoSystemPrompt = `You are a CTO (Chief Technology Officer) thinking partner. Your role is to help the user think through their startup idea before they hand it off to a coding agent.

Your job is to be a "razor" - you make them think deeper about:
1. **Value Proposition** - What problem are they solving? Why does it matter?
2. **Customer Experience** - How will users interact with this? What's the journey?
3. **Pain Points** - What frustrations does this solve? What's the alternative?
4. **Second & Third Order Consequences** - How do their technical choices impact other parts of the project? What are the ripple effects?
5. **Code Analysis** - When repo code is provided, analyze it like a CTO: assess architecture, identify issues, suggest improvements
6. **Purpose** - Are they staying true to their main goal? Keep them focused.

Ask probing questions. Challenge assumptions. Make them justify their choices. Be direct but helpful.
${projectContext}${repoContext}`;

      const messages = [
        { role: 'system' as const, content: ctoSystemPrompt },
        ...chatMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userMessage }
      ];
      
      const response = await llmClient.complete({
        messages,
        maxTokens: 500,
        temperature: 0.7
      });
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response. Make sure you have an LLM provider configured.');
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Make sure you have an LLM provider configured in Settings.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-[#141415] border-[#333333]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Project
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-[#888888] uppercase tracking-wider">Project Name</label>
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My App"
                  className="bg-[#1a1a1a] border-[#333333] text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-[#888888] uppercase tracking-wider">Description (optional)</label>
                <Textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="A brief description..."
                  className="bg-[#1a1a1a] border-[#333333] text-white mt-1"
                  rows={3}
                />
              </div>
              <Button
                onClick={createProject}
                disabled={isCreating || !newProjectName.trim()}
                className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Project
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Your Projects</h3>
            {projects.length > 0 && !selectedProjectId && (
              <span className="text-xs text-[#666666]">Select a project to chat with CTO</span>
            )}
          </div>
          
          {selectedProjectId ? (
            // Chat view
            <Card className="bg-[#141415] border-[#333333]">
              <CardHeader className="border-b border-[#333333]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedProjectId(null)}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <CardTitle className="text-white text-sm">
                        {projects.find(p => p.id === selectedProjectId)?.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-[#888888]">
                        CTO Agent - Your thinking partner
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setChatMessages([])}
                    className="border-[#333333] text-[#888888]"
                  >
                    Clear Chat
                  </Button>
                </div>
              </CardHeader>
              
              {/* GitHub Connection Bar */}
                <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#333333] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {githubConnected ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                          <span className="text-xs text-[#10B981]">GitHub Connected</span>
                        </div>
                        {selectedRepo && (
                          <Badge className="bg-[#333333] text-white text-xs">
                            {selectedRepo.name}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-[#666666]">Connect GitHub for codebase context</span>
                    )}
                  </div>
                  {githubConnected ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedRepo(null)}
                        className="text-xs text-[#888888] h-6"
                      >
                        {selectedRepo ? 'Deselect Repo' : 'Select Repo'}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={disconnectGitHub}
                        className="text-xs text-[#F59E0B] h-6"
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={connectGitHub}
                      disabled={isConnectingGithub}
                      className="border-[#333333] text-white text-xs h-6"
                    >
                      {isConnectingGithub ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Connect GitHub'}
                    </Button>
                  )}
                </div>
                
                  {/* Repo Selection */}
                  {githubConnected && !selectedRepo && githubRepos.length > 0 && (
                    <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#333333] max-h-32 overflow-y-auto">
                      <p className="text-xs text-[#666666] mb-2">Select a repository for context:</p>
                      <div className="flex flex-wrap gap-2">
                        {githubRepos.slice(0, 10).map((repo) => {
                          if (!repo) return null;
                          
                          // Type guard to help TypeScript understand repo is not null after this point
                          const safeRepo = repo as GitHubRepo;
                          
                          return (
                            <Badge 
                              key={safeRepo.id.toString()}
                              className={`bg-[#333333] hover:bg-[#444444] cursor-pointer text-white text-xs ${selectedRepo?.id === safeRepo.id ? 'ring-2 ring-[#3B82F6]' : ''}`}
                              onClick={() => handleRepoSelect(safeRepo)}
                            >
                              {safeRepo.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
              <CardContent className="p-0">
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-[#3B82F6] mx-auto mb-4" />
                      <p className="text-[#888888]">Start a conversation with your CTO</p>
                      <p className="text-xs text-[#666666] mt-2">
                        Ask about your value prop, customer pain points, or technical decisions
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user' 
                            ? 'bg-[#3B82F6] text-white' 
                            : 'bg-[#1a1a1a] text-[#EDEDED]'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="bg-[#1a1a1a] rounded-lg px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-[#333333]">
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={selectedProvider ? "Ask your CTO..." : "Configure LLM provider in Settings first"}
                      disabled={!selectedProvider || isChatting}
                      className="bg-[#1a1a1a] border-[#333333] text-white"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!selectedProvider || isChatting || !chatInput.trim()}
                      className="bg-[#3B82F6] hover:bg-[#2563EB]"
                    >
                      {isChatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </div>
                  {!selectedProvider && (
                    <p className="text-xs text-[#F59E0B] mt-2">
                      Configure an LLM provider in Settings to enable CTO chat
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : projects.length === 0 ? (
            <Card className="bg-[#141415] border-[#333333]">
              <CardContent className="py-12 text-center">
                <Target className="w-12 h-12 text-[#555555] mx-auto mb-4" />
                <p className="text-[#888888]">No projects yet</p>
                <p className="text-xs text-[#666666] mt-1">Create your first CTO project to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Card 
                  key={project.id} 
                  className="bg-[#141415] border-[#333333] hover:border-[#3B82F6]/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-white">{project.name}</h4>
                        {project.description && (
                          <p className="text-xs text-[#888888] mt-1">{project.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getPhaseColor(project.currentPhase)} text-white`}>
                          {project.currentPhase}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-[#666666]" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#666666]">
                      <Clock className="w-3 h-3" />
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                    <div className="mt-3 h-2 bg-[#262626] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getPhaseColor(project.currentPhase)} transition-all`}
                        style={{ width: `${getPhaseProgress(project.currentPhase)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-[#555555]">
                      <span>Planning</span>
                      <span>Architecture</span>
                      <span>Dev</span>
                      <span>Testing</span>
                      <span>Launch</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SDKSection() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#141415] border-[#333333]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-[#10B981]" />
              <div>
                <CardTitle className="text-white">TAIS RAG SDK</CardTitle>
                <CardDescription className="text-[#888888]">
                  npm package for third-party integrations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-[#888888] uppercase tracking-wider">Install</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-sm text-[#10B981] font-mono">
                  npm install -g tais-sdk-assistant
                </code>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard('npm install -g tais-sdk-assistant')} className="border-[#333333] text-white">
                  <Code className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-xs text-[#888888] uppercase tracking-wider">Usage</label>
              <ul className="mt-2 space-y-1 text-sm text-[#A1A1A1]">
                <li className="flex items-center gap-2">
                  <Code className="w-3 h-3 text-[#8B5CF6]" />
                  <code>tais-assistant init</code> - Initialize new project
                </li>
                <li className="flex items-center gap-2">
                  <Code className="w-3 h-3 text-[#8B5CF6]" />
                  <code>tais-assistant start</code> - Interactive onboarding
                </li>
                <li className="flex items-center gap-2">
                  <Code className="w-3 h-3 text-[#8B5CF6]" />
                  <code>tais-assistant test</code> - Test API integration
                </li>
                <li className="flex items-center gap-2">
                  <Code className="w-3 h-3 text-[#8B5CF6]" />
                  <code>tais-assistant config</code> - View/update config
                </li>
                <li className="flex items-center gap-2">
                  <Code className="w-3 h-3 text-[#8B5CF6]" />
                  <code>tais-assistant status</code> - Check SDK status
                </li>
                <li className="flex items-center gap-2">
                  <Code className="w-3 h-3 text-[#8B5CF6]" />
                  <code>tais-assistant analytics</code> - View integration metrics
                </li>
              </ul>
            </div>

            <a 
              href="https://www.npmjs.com/package/tais-rag-sdk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#3B82F6] hover:underline"
            >
              <BookOpen className="w-4 h-4" />
              View Full Documentation
            </a>
          </CardContent>
        </Card>

        <Card className="bg-[#141415] border-[#333333]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Terminal className="w-8 h-8 text-[#8B5CF6]" />
              <div>
                <CardTitle className="text-white">SDK Assistant CLI</CardTitle>
                <CardDescription className="text-[#888888]">
                  Interactive command-line tool
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-sm text-white">Not yet published</span>
              </div>
              <p className="text-xs text-[#888888]">
                The SDK Assistant CLI is in development. Use the RAG SDK npm package for now.
              </p>
            </div>

            <div>
              <label className="text-xs text-[#888888] uppercase tracking-wider">Available Commands (Coming Soon)</label>
              <ul className="mt-2 space-y-1 text-sm text-[#A1A1A1]">
                <li className="flex items-center gap-2">
                  <Code className="w-3 h-3 text-[#8B5CF6]" />
                  <code>tais init</code> - Initialize new project
                </li>
                <li className="flex items-center gap-2">
                  <Code className="w-3 h-3 text-[#8B5CF6]" />
                  <code>tais start</code> - Interactive onboarding
                </li>
                <li className="flex items-center gap-2">
                  <Code className="w-3 h-3 text-[#8B5CF6]" />
                  <code>tais test</code> - Test API integration
                </li>
                <li className="flex items-center gap-2">
                  <Code className="w-3 h-3 text-[#8B5CF6]" />
                  <code>tais config</code> - View/update config
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#141415] border-[#333333]">
        <CardHeader>
          <CardTitle className="text-white">API Authentication</CardTitle>
          <CardDescription className="text-[#888888]">
            The SDK uses wallet signature authentication. Only Genesis NFT holders can authenticate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Gold Tier Verified</span>
            </div>
            <p className="text-xs text-[#888888]">
              Your wallet has Genesis NFT access. You can use all SDK methods with full quota.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
