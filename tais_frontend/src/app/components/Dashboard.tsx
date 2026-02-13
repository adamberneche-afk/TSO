// TAIS Platform - My Agents Dashboard

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
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
} from 'lucide-react';
import { AgentConfig } from '../../types/agent';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { configApi } from '../../services/configApi';

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

  useEffect(() => {
    // Load saved agents from backend API
    loadSavedAgents();
  }, []);

  const loadSavedAgents = async () => {
    setIsLoading(true);
    setError(null);
    
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
    } catch (err) {
      console.error('Failed to load agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configurations');
      toast.error('Failed to load saved configurations');
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
                  onDownload={() => downloadAgent(agent)}
                  onCopy={() => copyAgentConfig(agent.config)}
                  onDelete={() => deleteAgent(agent.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>
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
  onDownload: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

function AgentCard({ agent, onDownload, onCopy, onDelete }: AgentCardProps) {
  const { config } = agent;
  const formattedDate = new Date(agent.lastModified).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card className="bg-[#1a1a1a] border-[#333333] hover:border-[#3B82F6] transition-all group">
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
        <div className="flex items-center gap-2 pt-2 border-t border-[#333333]">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="flex-1 text-[#888888] hover:text-white hover:bg-[#222222]"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="flex-1 text-[#888888] hover:text-white hover:bg-[#222222]"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy
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