'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Download, 
  Trash2, 
  Filter, 
  Clock, 
  Brain,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { ReflectiveMemoryAPI, CoreMemoryAPI, ActiveMemoryAPI } from '@/services/memory';
import { PromoteToCoreDialog, CoreMemoryCard } from './PromoteToCoreDialog';

interface MemoryFilter {
  timeRange: 'all' | 'week' | 'month' | 'year';
  maturityState: 'all' | 'active' | 'reflective' | 'immutable' | 'core';
  search: string;
}

export function MemoryArchivePage() {
  const [filter, setFilter] = useState<MemoryFilter>({
    timeRange: 'all',
    maturityState: 'all',
    search: '',
  });
  const [loading, setLoading] = useState(true);
  const [activeMemories, setActiveMemories] = useState<any[]>([]);
  const [reflectiveMemories, setReflectiveMemories] = useState<any[]>([]);
  const [coreMemories, setCoreMemories] = useState<any[]>([]);
  const [selectedLearning, setSelectedLearning] = useState<{ learning: any; memoryId: string } | null>(null);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const activeAPI = new ActiveMemoryAPI();
      const reflectiveAPI = new ReflectiveMemoryAPI();
      const coreAPI = new CoreMemoryAPI();

      const [active, reflective, core] = await Promise.all([
        activeAPI.listForUser('', 50),
        reflectiveAPI.listForUser(50),
        coreAPI.list(),
      ]);

      setActiveMemories(active);
      setReflectiveMemories(reflective);
      setCoreMemories(core);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMemories = (memories: any[]): any[] => {
    let filtered = [...memories];

    // Search filter
    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(m => 
        m.sessionSummary?.conversationSummary?.toLowerCase().includes(search) ||
        m.reflection?.learnings?.some((l: any) => l.content?.toLowerCase().includes(search)) ||
        m.content?.toLowerCase().includes(search)
      );
    }

    return filtered;
  };

  const handlePromote = async (memoryId: string) => {
    const memory = reflectiveMemories.find(m => m.memoryId === memoryId);
    if (memory?.reflection?.learnings?.[0]) {
      setSelectedLearning({
        learning: memory.reflection.learnings[0],
        memoryId,
      });
      setPromoteDialogOpen(true);
    }
  };

  const handleExport = () => {
    const exportData = {
      export_version: '3.0',
      export_timestamp: new Date().toISOString(),
      memories: {
        active: activeMemories,
        reflective: reflectiveMemories,
        core: coreMemories,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tais-memories-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteMemory = async (memoryId: string, type: 'active' | 'reflective' | 'core') => {
    if (!confirm('Are you sure you want to delete this memory? This cannot be undone.')) {
      return;
    }

    try {
      if (type === 'active') {
        const api = new ActiveMemoryAPI();
        await api.delete(memoryId);
        setActiveMemories(prev => prev.filter(m => m.memoryId !== memoryId));
      } else if (type === 'reflective') {
        // Would need delete method
        setReflectiveMemories(prev => prev.filter(m => m.memoryId !== memoryId));
      } else if (type === 'core') {
        const api = new CoreMemoryAPI();
        await api.delete(memoryId);
        setCoreMemories(prev => prev.filter(m => m.memoryId !== memoryId));
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredActive = filterMemories(activeMemories);
  const filteredReflective = filterMemories(reflectiveMemories);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Memory Archive</h1>
          <p className="text-muted-foreground mt-1">
            Your agent's learned memories and insights
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select
          value={filter.maturityState}
          onValueChange={(v) => setFilter({ ...filter, maturityState: v as any })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Memory Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="active">Active (0-24h)</SelectItem>
            <SelectItem value="reflective">Reflective (24h-7d)</SelectItem>
            <SelectItem value="immutable">Immutable (7d+)</SelectItem>
            <SelectItem value="core">Core Memory</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="core" className="space-y-4">
        <TabsList>
          <TabsTrigger value="core" className="gap-1">
            <Brain className="w-4 h-4" />
            Core ({coreMemories.length})
          </TabsTrigger>
          <TabsTrigger value="reflective" className="gap-1">
            <Clock className="w-4 h-4" />
            Reflective ({filteredReflective.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-1">
            <Filter className="w-4 h-4" />
            Active ({filteredActive.length})
          </TabsTrigger>
        </TabsList>

        {/* Core Memories */}
        <TabsContent value="core" className="space-y-4">
          {coreMemories.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No Core Memories yet. Promote learnings from reflective memories to create Core Memories.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {coreMemories.map((memory) => (
                <CoreMemoryCard
                  key={memory.memoryId}
                  memory={memory}
                  onDelete={(id) => handleDeleteMemory(id, 'core')}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reflective Memories */}
        <TabsContent value="reflective" className="space-y-4">
          {filteredReflective.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No reflective memories yet. These appear after daily reflection processing.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredReflective.map((memory) => (
                <Card key={memory.memoryId} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Reflective</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(memory.timestamp).toLocaleDateString()}
                        </span>
                        {memory.relevanceScore && (
                          <Badge variant="secondary" className="text-xs">
                            Relevance: {Math.round(memory.relevanceScore * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2 mb-2">
                        {memory.sessionSummary?.conversationSummary || 'Session summary unavailable'}
                      </p>
                      {memory.reflection?.learnings?.[0] && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Learning:</p>
                          <p className="text-sm">{memory.reflection.learnings[0].content}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromote(memory.memoryId)}
                      >
                        Make Core
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active Memories */}
        <TabsContent value="active" className="space-y-4">
          {filteredActive.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active memories. Start a conversation to create memories.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredActive.map((memory) => (
                <Card key={memory.memoryId} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Active</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(memory.timestamp).toLocaleDateString()}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {memory.sessionSummary?.appContext}
                        </Badge>
                      </div>
                      <p className="text-sm line-clamp-2">
                        {memory.sessionSummary?.conversationSummary || 'Session summary unavailable'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteMemory(memory.memoryId, 'active')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Promote to Core Dialog */}
      {selectedLearning && (
        <PromoteToCoreDialog
          learning={selectedLearning.learning}
          memoryId={selectedLearning.memoryId}
          open={promoteDialogOpen}
          onOpenChange={setPromoteDialogOpen}
          onPromoted={() => {
            loadMemories();
            setSelectedLearning(null);
          }}
        />
      )}
    </div>
  );
}

export default MemoryArchivePage;
