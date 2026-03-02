import React, { useState, useEffect } from 'react';
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
import { configApi } from '../../services/configApi';

interface CTOProject {
  id: string;
  name: string;
  description?: string;
  currentPhase: string;
  createdAt: string;
  updatedAt: string;
}

interface GoldTierDashboardProps {
  onBack: () => void;
}

export function GoldTierDashboard({ onBack }: GoldTierDashboardProps) {
  const { address, isConnected, hasGenesisNFT } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'cto' | 'sdk'>('overview');
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

        {activeTab === 'sdk' && (
          <SDKSection />
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

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com'}/api/v1/cto/projects?wallet=${address}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
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
      const response = await fetch(`${import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com'}/api/v1/cto/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          wallet: address,
          name: newProjectName,
          description: newProjectDesc
        }),
      });
      if (response.ok) {
        toast.success('Project created!');
        setNewProjectName('');
        setNewProjectDesc('');
        loadProjects();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
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
          <h3 className="text-lg font-semibold text-white">Your Projects</h3>
          {projects.length === 0 ? (
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
                <Card key={project.id} className="bg-[#141415] border-[#333333] hover:border-[#3B82F6]/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-white">{project.name}</h4>
                        {project.description && (
                          <p className="text-xs text-[#888888] mt-1">{project.description}</p>
                        )}
                      </div>
                      <Badge className={`${getPhaseColor(project.currentPhase)} text-white`}>
                        {project.currentPhase}
                      </Badge>
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
