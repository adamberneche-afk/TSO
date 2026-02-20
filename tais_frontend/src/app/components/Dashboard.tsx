// TAIS Platform - My Agents Dashboard

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import Editor from '@monaco-editor/react';
import {
  ArrowLeft,
  Plus,
  Search,
  Download,
  Copy,
  Trash2,
  ExternalLink,
  Filter,
  Calendar,
  Zap,
  Loader2,
  X,
  FileText,
  Eye,
  AlertTriangle,
  Wallet,
  Edit,
  Save,
  Database,
  Globe,
  Lock,
  Code,
  FileCode,
} from 'lucide-react';
import { AgentConfig } from '../../types/agent';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { configApi } from '../../services/configApi';
import { authApi } from '../../services/authApi';
import { useWallet } from '../../hooks/useWallet';
import { generateConfigSummary, generateBulletSummary } from '../../lib/config-summary';

interface DashboardProps {
  onBackToLanding: () => void;
  onStartNewInterview: () => void;
}

export function Dashboard({ onBackToLanding, onStartNewInterview }: DashboardProps) {
  const [agents, setAgents] = useState<SavedAgent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<SavedAgent | null>(null);
  const [walletMismatch, setWalletMismatch] = useState<boolean>(false);
  const [needsReAuth, setNeedsReAuth] = useState<boolean>(false);
  const { address: currentWallet, isConnected, connect } = useWallet();

  useEffect(() => {
    // Load saved agents from backend API
    loadSavedAgents();
  }, [currentWallet]); // Reload when wallet changes

  const handleReconnect = async () => {
    authApi.logout();
    setNeedsReAuth(true);
    
    try {
      // Trigger wallet connection flow which will ask for signature
      await connect();
      // After successful connection, reload agents
      loadSavedAgents();
    } catch (error) {
      console.error('Reconnection failed:', error);
      toast.error('Authentication failed', {
        description: 'Please try connecting your wallet again'
      });
    }
  };

  const loadSavedAgents = async () => {
    setIsLoading(true);
    setError(null);
    setWalletMismatch(false);
    setNeedsReAuth(false);
    
    // Check if we have a token at all
    const token = authApi.getToken();
    if (!token) {
      console.warn('[Dashboard] No auth token');
      setNeedsReAuth(true);
      setIsLoading(false);
      return;
    }
    
    // Verify wallet matches JWT before loading
    if (currentWallet && !authApi.isWalletMatch(currentWallet)) {
      console.warn('[Dashboard] Wallet mismatch detected');
      setWalletMismatch(true);
      setNeedsReAuth(true);
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await configApi.getConfigurations();
      
      // Transform API response to SavedAgent format
      const savedAgents: SavedAgent[] = response.configurations.map(config => ({
        id: config.id,
        config: config.configData as AgentConfig,
        createdAt: config.createdAt,
        lastModified: config.updatedAt,
        status: config.isActive ? 'active' : 'archived',
      }));
      
      setAgents(savedAgents);
    } catch (err: any) {
      console.error('Failed to load agents:', err);
      
      // Check if it's an auth error
      if (err.message?.includes('Authentication required') || err.message?.includes('401')) {
        setNeedsReAuth(true);
        setWalletMismatch(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load configurations');
        toast.error('Failed to load saved configurations');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAgent = (agent: SavedAgent) => {
    const blob = new Blob([JSON.stringify(agent.config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.config.agent.name}-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${agent.config.agent.name} configuration downloaded!`);
  };

  const deleteAgent = async (agentId: string) => {
    if (confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      try {
        await configApi.deleteConfiguration(agentId);
        setAgents(agents.filter((a) => a.id !== agentId));
        toast.success('Agent deleted successfully!');
      } catch (err) {
        toast.error('Failed to delete agent');
      }
    }
  };

  const copyAgentConfig = (config: AgentConfig) => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    toast.success('Agent configuration copied to clipboard!');
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.config.agent.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-[#333333] bg-[#111111]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-[#888888] hover:text-white"
              onClick={onBackToLanding}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-[#333333]" />
            <h1 className="text-2xl font-bold text-white">My Agents</h1>
          </div>
          <Button
            onClick={onStartNewInterview}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Agent
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Wallet Mismatch / Re-Authentication Warning */}
        {(walletMismatch || needsReAuth) && (
          <div className="mb-6 bg-[#F59E0B]/10 border border-[#F59E0B] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#F59E0B]/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white mb-1">
                  {walletMismatch ? 'Wallet Changed - Re-Authentication Required' : 'Authentication Required'}
                </h4>
                <p className="text-sm text-[#888888] mb-3">
                  {walletMismatch 
                    ? 'You\'ve switched to a different wallet. Please sign a message to authenticate this wallet and view your saved agents.'
                    : 'Please connect and authenticate your wallet to view saved agents.'}
                </p>
                {walletMismatch && (
                  <div className="flex items-center gap-4 text-xs mb-3 bg-[#1a1a1a] p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-3 h-3 text-[#F59E0B]" />
                      <span className="text-[#888888]">Connected:</span>
                      <span className="text-white font-mono">{currentWallet?.slice(0, 6)}...{currentWallet?.slice(-4)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#888888]">Previously:</span>
                      <span className="text-[#666666] font-mono">{authApi.getWalletFromToken()?.slice(0, 6)}...{authApi.getWalletFromToken()?.slice(-4)}</span>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleReconnect}
                  className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
                  size="sm"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {isConnected ? 'Sign to Authenticate' : 'Connect & Authenticate Wallet'}
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<Zap className="w-5 h-5 text-[#3B82F6]" />}
            label="Total Agents"
            value={agents.length}
          />
          <StatCard
            icon={<Calendar className="w-5 h-5 text-[#10B981]" />}
            label="Active"
            value={agents.filter((a) => a.status === 'active').length}
          />
          <StatCard
            icon={<Download className="w-5 h-5 text-[#F59E0B]" />}
            label="Skills Used"
            value={agents.reduce((sum, a) => sum + (a.config.agent.skills?.length || 0), 0)}
          />
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555555]" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#111111] border-[#333333] text-white placeholder:text-[#555555]"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
              className={
                filterStatus === 'all'
                  ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white'
                  : 'border-[#333333] text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
              }
            >
              <Filter className="w-4 h-4 mr-2" />
              All
            </Button>
            <Button
              variant={filterStatus === 'active' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('active')}
              className={
                filterStatus === 'active'
                  ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white'
                  : 'border-[#333333] text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
              }
            >
              Active
            </Button>
          </div>
        </div>

        {/* Agents Grid */}
        {filteredAgents.length === 0 ? (
          <EmptyState onCreateNew={onStartNewInterview} hasAgents={agents.length > 0} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AgentCard
                  agent={agent}
                  onView={() => setSelectedAgent(agent)}
                  onDownload={() => downloadAgent(agent)}
                  onCopy={() => copyAgentConfig(agent.config)}
                  onDelete={() => deleteAgent(agent.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentDetailModal
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            onDownload={() => downloadAgent(selectedAgent)}
            onCopy={() => copyAgentConfig(selectedAgent.config)}
            onDelete={() => {
              deleteAgent(selectedAgent.id);
              setSelectedAgent(null);
            }}
            onUpdate={(updatedAgent) => {
              setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
              setSelectedAgent(updatedAgent);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface SavedAgent {
  id: string;
  config: AgentConfig;
  createdAt: string;
  lastModified: string;
  status: 'active' | 'archived';
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card className="bg-[#1a1a1a] border-[#333333] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#888888] mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-lg bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface AgentCardProps {
  agent: SavedAgent;
  onView: () => void;
  onDownload: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

function AgentCard({ agent, onView, onDownload, onCopy, onDelete }: AgentCardProps) {
  const { config } = agent;
  const formattedDate = new Date(agent.lastModified).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card 
      className="bg-[#1a1a1a] border-[#333333] hover:border-[#3B82F6] transition-all group cursor-pointer"
      onClick={onView}
    >
      <div className="p-6 space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">{config.agent.name}</h3>
          <p className="text-sm text-[#888888] line-clamp-2">
            {config.agent.description || 'No description provided'}
          </p>
        </div>

        {/* Goals */}
        <div className="flex flex-wrap gap-2">
          {config.agent.goals.slice(0, 3).map((goal, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="bg-[rgba(59,130,246,0.1)] text-[#3B82F6] border border-[#3B82F6] text-xs"
            >
              {goal}
            </Badge>
          ))}
          {config.agent.goals.length > 3 && (
            <Badge
              variant="secondary"
              className="bg-[#222222] text-[#888888] text-xs"
            >
              +{config.agent.goals.length - 3}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-[#888888]">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {config.agent.skills.length} skills
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formattedDate}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#333333]" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            className="flex-1 text-[#3B82F6] hover:text-white hover:bg-[#3B82F6]"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="text-[#888888] hover:text-white hover:bg-[#222222]"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="text-[#888888] hover:text-white hover:bg-[#222222]"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-[#EF4444] hover:text-white hover:bg-[rgba(239,68,68,0.1)]"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface AgentDetailModalProps {
  agent: SavedAgent;
  onClose: () => void;
  onDownload: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onUpdate: (agent: SavedAgent) => void;
}

function AgentDetailModal({ agent, onClose, onDownload, onCopy, onDelete, onUpdate }: AgentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'framework' | 'personality' | 'summary'>('framework');
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<AgentConfig>(JSON.parse(JSON.stringify(agent.config)));
  const [isSaving, setIsSaving] = useState(false);
  
  const currentConfig = isEditing ? editedConfig : agent.config;
  const fullConfigJSON = JSON.stringify(currentConfig, null, 2);
  
  const frameworkConfig = {
    name: currentConfig.agent.name,
    version: currentConfig.agent.version,
    skills: currentConfig.agent.skills,
    constraints: currentConfig.agent.constraints,
    autonomy: currentConfig.agent.autonomy,
    knowledge: currentConfig.agent.knowledge,
  };
  const frameworkJSON = JSON.stringify(frameworkConfig, null, 2);
  
  const personalityMd = currentConfig.agent.personalityMd || '';
  const naturalSummary = generateConfigSummary(currentConfig);
  const bulletSummary = generateBulletSummary(currentConfig);
  const formattedDate = new Date(agent.lastModified).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await configApi.updateConfiguration(agent.id, {
        name: editedConfig.agent.name,
        description: editedConfig.agent.description,
        configData: editedConfig
      });
      onUpdate({ ...agent, config: editedConfig, lastModified: new Date().toISOString() });
      setIsEditing(false);
      toast.success('Configuration updated!');
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      // Merge framework changes back into full config
      setEditedConfig(prev => ({
        ...prev,
        agent: {
          ...prev.agent,
          name: parsed.name || prev.agent.name,
          version: parsed.version || prev.agent.version,
          skills: parsed.skills || prev.agent.skills,
          constraints: parsed.constraints || prev.agent.constraints,
          autonomy: parsed.autonomy || prev.agent.autonomy,
          knowledge: parsed.knowledge || prev.agent.knowledge,
        }
      }));
    } catch {
      // Invalid JSON, ignore
    }
  };

  const addKnowledgeSource = (source: any) => {
    const newSource = {
      id: `source-${Date.now()}`,
      type: 'public-rag' as const,
      documentId: source.id,
      title: source.title || 'Untitled',
      enabled: true,
      priority: 5
    };
    
    setEditedConfig(prev => ({
      ...prev,
      agent: {
        ...prev.agent,
        knowledge: {
          ...prev.agent.knowledge,
          sources: [...(prev.agent.knowledge?.sources || []), newSource]
        }
      }
    }));
  };

  const removeKnowledgeSource = (sourceId: string) => {
    setEditedConfig(prev => ({
      ...prev,
      agent: {
        ...prev.agent,
        knowledge: {
          ...prev.agent.knowledge,
          sources: (prev.agent.knowledge?.sources || []).filter(s => s.id !== sourceId)
        }
      }
    }));
  };

  const updateKnowledgeSource = (sourceId: string, updates: any) => {
    setEditedConfig(prev => ({
      ...prev,
      agent: {
        ...prev.agent,
        knowledge: {
          ...prev.agent.knowledge,
          sources: (prev.agent.knowledge?.sources || []).map(s => 
            s.id === sourceId ? { ...s, ...updates } : s
          )
        }
      }
    }));
  };

  const knowledgeSources = (isEditing ? editedConfig : agent.config).agent.knowledge?.sources || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#111111] border border-[#333333] rounded-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col scrollbar-thin scrollbar-thumb-[#333333] scrollbar-track-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333333] bg-[#1a1a1a]">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isEditing ? 'Edit: ' : ''}{(isEditing ? editedConfig : agent.config).agent.name}
            </h2>
            <p className="text-sm text-[#888888]">
              Last modified: {formattedDate} • {(isEditing ? editedConfig : agent.config).agent.skills.length} skills
              {knowledgeSources.length > 0 && ` • ${knowledgeSources.length} knowledge sources`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedConfig(JSON.parse(JSON.stringify(agent.config)));
                  }}
                  className="border-[#333333] text-[#888888] hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#10B981] hover:bg-[#059669] text-white"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="border-[#3B82F6] text-[#3B82F6] hover:bg-[rgba(59,130,246,0.1)]"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                  className="border-[#333333] text-[#888888] hover:text-white"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCopy}
                  className="border-[#333333] text-[#888888] hover:text-white"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  className="border-[#EF4444] text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)]"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[#888888] hover:text-white ml-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 bg-[#1a1a1a] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('framework')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'framework'
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[#888888] hover:text-white hover:bg-[#252525]'
              }`}
            >
              <Code className="w-4 h-4" />
              Framework
            </button>
            <button
              onClick={() => setActiveTab('personality')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'personality'
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[#888888] hover:text-white hover:bg-[#252525]'
              }`}
            >
              <FileCode className="w-4 h-4" />
              Personality
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'summary'
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[#888888] hover:text-white hover:bg-[#252525]'
              }`}
            >
              <FileText className="w-4 h-4" />
              Summary
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-[#333333] rounded-lg overflow-hidden h-[600px]">
            {activeTab === 'framework' && (
              <>
                <div className="bg-[#252525] px-4 py-3 border-b border-[#333333] flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                    <span className="text-xs text-[#888888] uppercase tracking-wider font-medium">framework.json</span>
                  </div>
                  <span className="text-xs text-[#666666]">Rigid • Validated • Type-Safe</span>
                </div>
                <Editor
                  height="calc(100% - 80px)"
                  defaultLanguage="json"
                  value={frameworkJSON}
                  theme="vs-dark"
                  onChange={isEditing ? handleConfigChange : undefined}
                  options={{
                    readOnly: !isEditing,
                    minimap: { enabled: false },
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono, monospace',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                  }}
                />
                <div className="bg-[#1a1a1a] px-4 py-2 border-t border-[#333333]">
                  <p className="text-xs text-[#666666]">
                    Contains: name, version, skills, constraints, autonomy, knowledge sources
                  </p>
                </div>
              </>
            )}

            {activeTab === 'personality' && (
              <>
                <div className="bg-[#252525] px-4 py-3 border-b border-[#333333] flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#8B5CF6]"></div>
                    <span className="text-xs text-[#888888] uppercase tracking-wider font-medium">personality.md</span>
                  </div>
                  <span className="text-xs text-[#666666]">Flexible • LLM-Friendly</span>
                </div>
                {personalityMd ? (
                  <Editor
                    height="calc(100% - 80px)"
                    defaultLanguage="markdown"
                    value={personalityMd}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono, monospace',
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                    }}
                  />
                ) : (
                  <div className="h-[calc(100%-80px)] flex items-center justify-center bg-[#111111]">
                    <div className="text-center space-y-4">
                      <FileCode className="w-12 h-12 text-[#666666] mx-auto" />
                      <div>
                        <p className="text-[#888888]">No personality markdown configured</p>
                        <p className="text-sm text-[#666666] mt-1">
                          Using: {currentConfig.agent.personality.tone}, {currentConfig.agent.personality.verbosity}, {currentConfig.agent.personality.formality}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-[#1a1a1a] px-4 py-2 border-t border-[#333333]">
                  <p className="text-xs text-[#666666]">
                    Contains: identity, communication style, response guidelines, examples
                  </p>
                </div>
              </>
            )}

            {activeTab === 'summary' && (
              <div className="h-full overflow-y-auto bg-[#1a1a1a]">
                <div className="p-5 space-y-5">
                  <div className="p-4 bg-[#252525] rounded-lg border-l-4 border-[#3B82F6]">
                    <h5 className="text-xs text-[#3B82F6] uppercase tracking-wider mb-2 font-semibold">Overview</h5>
                    <p className="text-sm text-[#e0e0e0] leading-relaxed whitespace-pre-line">
                      {naturalSummary}
                    </p>
                  </div>
                  
                  <div>
                    <h5 className="text-xs text-[#888888] uppercase tracking-wider mb-3 font-semibold">Quick Stats</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {bulletSummary.slice(0, 4).map((item, index) => (
                        <div key={index} className="bg-[#252525] rounded p-3 border border-[#333333]">
                          <dt className="text-xs text-[#888888] mb-1">{item.label}</dt>
                          <dd className="text-sm text-white font-medium truncate">{item.value}</dd>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-[#252525] rounded-lg border border-[#333333]">
                    <h5 className="text-xs text-[#888888] uppercase tracking-wider px-4 py-3 border-b border-[#333333] font-semibold">
                      Detailed Breakdown
                    </h5>
                    <dl className="divide-y divide-[#333333]">
                      {bulletSummary.map((item, index) => (
                        <div key={index} className="flex justify-between px-4 py-3 text-sm">
                          <dt className="text-[#888888]">{item.label}</dt>
                          <dd className="text-white font-medium text-right">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Knowledge Sources */}
                  <div className="bg-[#252525] rounded-lg border border-[#333333]">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333]">
                      <h5 className="text-xs text-[#888888] uppercase tracking-wider font-semibold flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Knowledge Sources
                      </h5>
                      {knowledgeSources.length > 0 && (
                        <span className="text-xs text-[#3B82F6]">{knowledgeSources.length} sources</span>
                      )}
                    </div>
                    
                    {knowledgeSources.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <Database className="w-8 h-8 text-[#555555] mx-auto mb-2" />
                        <p className="text-sm text-[#888888]">No knowledge sources configured</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#333333]">
                        {knowledgeSources.map((source: any) => (
                          <div key={source.id} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {source.type === 'public-rag' ? (
                                <Globe className="w-4 h-4 text-[#3B82F6]" />
                              ) : source.type === 'private-rag' ? (
                                <Lock className="w-4 h-4 text-[#10B981]" />
                              ) : (
                                <Database className="w-4 h-4 text-[#888888]" />
                              )}
                              <div>
                                <p className="text-sm text-white">{source.title || source.documentId}</p>
                                <p className="text-xs text-[#666666]">Priority: {source.priority}</p>
                              </div>
                            </div>
                            {isEditing && (
                              <div className="flex items-center gap-2">
                                <select
                                  value={source.priority}
                                  onChange={(e) => updateKnowledgeSource(source.id, { priority: Number(e.target.value) })}
                                  className="bg-[#1a1a1a] border border-[#333333] rounded text-xs text-[#888888] px-2 py-1"
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                                    <option key={p} value={p}>P{p}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => removeKnowledgeSource(source.id)}
                                  className="text-[#888888] hover:text-red-400 p-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {personalityMd && (
                    <div className="bg-[#252525] rounded-lg border border-[#333333]">
                      <h5 className="text-xs text-[#888888] uppercase tracking-wider px-4 py-3 border-b border-[#333333] font-semibold">
                        Personality Markdown Preview
                      </h5>
                      <div className="p-4">
                        <pre className="text-xs text-[#e0e0e0] whitespace-pre-wrap font-mono">
                          {personalityMd.slice(0, 500)}
                          {personalityMd.length > 500 && '...'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface EmptyStateProps {
  onCreateNew: () => void;
  hasAgents: boolean;
}

function EmptyState({ onCreateNew, hasAgents }: EmptyStateProps) {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#1a1a1a] border border-[#333333] flex items-center justify-center">
        <Zap className="w-10 h-10 text-[#888888]" />
      </div>
      <h3 className="text-2xl font-semibold text-white mb-2">
        {hasAgents ? 'No agents found' : 'No agents yet'}
      </h3>
      <p className="text-[#888888] mb-6 max-w-md mx-auto">
        {hasAgents
          ? 'Try adjusting your search or filter criteria'
          : 'Create your first AI agent using our simple interview wizard'}
      </p>
      {!hasAgents && (
        <Button
          onClick={onCreateNew}
          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Your First Agent
        </Button>
      )}
    </div>
  );
}