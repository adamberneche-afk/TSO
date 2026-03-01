import React, { useState, useEffect } from 'react';
import { useInterviewStore } from '../../../hooks/useInterview';
import { usePublicRAG } from '../../../hooks/usePublicRAG';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Database, 
  Globe, 
  Lock, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import type { KnowledgeSource } from '../../../lib/config-schema';

interface KnowledgeStepProps {
  onNext?: () => void;
}

export function KnowledgeStep({ onNext }: KnowledgeStepProps) {
  const { answers, updateAnswers } = useInterviewStore();
  const { 
    documents: publicDocuments, 
    communityDocuments,
    loadMyDocuments,
    loadCommunity,
    isLoading,
    isInitialized,
    initialize
  } = usePublicRAG();

  const [selectedSources, setSelectedSources] = useState<KnowledgeSource[]>(
    answers.knowledge?.sources || []
  );
  const [activeTab, setActiveTab] = useState<'my-docs' | 'community'>('my-docs');

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    updateAnswers({
      knowledge: {
        sources: selectedSources,
        retrievalConfig: answers.knowledge?.retrievalConfig || {
          topK: 5,
          similarityThreshold: 0.7,
          reranking: false,
          citationStyle: 'inline'
        }
      }
    });
  }, [selectedSources]);

  const toggleDocument = (doc: any, type: 'public-rag' | 'private-rag') => {
    const sourceId = `${type}-${doc.id}`;
    const existingIndex = selectedSources.findIndex(s => s.id === sourceId);

    if (existingIndex >= 0) {
      setSelectedSources(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedSources(prev => [...prev, {
        id: sourceId,
        type,
        documentId: doc.id,
        title: doc.title || 'Untitled',
        enabled: true,
        priority: 5
      }]);
    }
  };

  const isDocumentSelected = (docId: string, type: 'public-rag' | 'private-rag') => {
    return selectedSources.some(s => s.documentId === docId && s.type === type);
  };

  const removeSource = (sourceId: string) => {
    setSelectedSources(prev => prev.filter(s => s.id !== sourceId));
  };

  const updatePriority = (sourceId: string, priority: number) => {
    setSelectedSources(prev => prev.map(s => 
      s.id === sourceId ? { ...s, priority } : s
    ));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">Knowledge Sources</h2>
        <p className="text-[#A1A1A1]">
          Select documents from your RAG knowledge base to give your agent access to specialized information.
        </p>
      </div>

      {selectedSources.length > 0 && (
        <div className="bg-[#141415] border border-[#262626] rounded-lg p-4">
          <h3 className="text-xs uppercase tracking-widest text-[#717171] mb-3">
            Selected Knowledge ({selectedSources.length})
          </h3>
          <div className="space-y-2">
            {selectedSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between bg-[#0A0A0B] border border-[#262626] rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  {source.type === 'public-rag' ? (
                    <Globe className="w-4 h-4 text-[#3B82F6]" />
                  ) : (
                    <Lock className="w-4 h-4 text-[#4ADE80]" />
                  )}
                  <span className="text-sm text-[#EDEDED]">{source.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={source.priority}
                    onChange={(e) => updatePriority(source.id, Number(e.target.value))}
                    className="bg-[#141415] border border-[#262626] rounded text-xs text-[#A1A1A1] px-2 py-1"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                      <option key={p} value={p}>Priority {p}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeSource(source.id)}
                    className="text-[#A1A1A1] hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-[#262626]">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('my-docs')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'my-docs'
                ? 'text-white border-[#3B82F6]'
                : 'text-[#717171] border-transparent hover:text-[#A1A1A1]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              My Documents
            </div>
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'community'
                ? 'text-white border-[#3B82F6]'
                : 'text-[#717171] border-transparent hover:text-[#A1A1A1]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Community
            </div>
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#3B82F6]" />
        </div>
      )}

      {!isLoading && activeTab === 'my-docs' && (
        <div className="space-y-3">
          {publicDocuments.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#262626] rounded-lg">
              <Database className="w-8 h-8 text-[#717171] mx-auto mb-3" />
              <p className="text-[#A1A1A1] text-sm mb-4">No documents in your knowledge base</p>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/#rag'}
                className="border-[#262626] text-[#A1A1A1]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Documents
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {publicDocuments.map((doc) => (
                <Card
                  key={doc.id}
                  className={`cursor-pointer transition-all bg-[#141415] border-[#262626] ${
                    isDocumentSelected(doc.id, 'public-rag')
                      ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]/30'
                      : 'hover:border-white/20'
                  }`}
                  onClick={() => toggleDocument(doc, 'public-rag')}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isDocumentSelected(doc.id, 'public-rag') ? (
                          <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#717171]" />
                        )}
                        <span className="text-sm font-medium text-[#EDEDED]">
                          {doc.title || 'Untitled'}
                        </span>
                      </div>
                      {doc.isPublic && (
                        <Globe className="w-3 h-3 text-[#3B82F6]" />
                      )}
                    </div>
                    <p className="text-xs text-[#717171]">
                      {doc.chunkCount || 0} chunks • {doc.size ? (doc.size / 1024).toFixed(1) : 0} KB
                    </p>
                    {(doc.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(doc.tags || []).slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[8px] uppercase tracking-tighter bg-[#0A0A0B] border border-[#262626] px-1.5 py-0.5 rounded text-[#717171]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && activeTab === 'community' && (
        <div className="space-y-3">
          {communityDocuments.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#262626] rounded-lg">
              <Globe className="w-8 h-8 text-[#717171] mx-auto mb-3" />
              <p className="text-[#A1A1A1] text-sm">No community documents available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {communityDocuments.map((doc) => (
                <Card
                  key={doc.id}
                  className={`cursor-pointer transition-all bg-[#141415] border-[#262626] ${
                    isDocumentSelected(doc.id, 'public-rag')
                      ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]/30'
                      : 'hover:border-white/20'
                  }`}
                  onClick={() => toggleDocument(doc, 'public-rag')}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isDocumentSelected(doc.id, 'public-rag') ? (
                          <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#717171]" />
                        )}
                        <span className="text-sm font-medium text-[#EDEDED]">
                          {doc.title || 'Untitled'}
                        </span>
                      </div>
                      <Globe className="w-3 h-3 text-[#3B82F6]" />
                    </div>
                    <p className="text-xs text-[#717171]">
                      By {doc.author || 'Unknown'}
                    </p>
                    {(doc.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(doc.tags || []).slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[8px] uppercase tracking-tighter bg-[#0A0A0B] border border-[#262626] px-1.5 py-0.5 rounded text-[#717171]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-[#141415] border border-[#262626] rounded-lg p-4">
        <h4 className="text-xs uppercase tracking-widest text-[#717171] mb-3">Retrieval Settings</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="topk" className="text-xs text-[#A1A1A1] mb-1 block">Max Results (topK)</label>
            <input
              id="topk"
              name="topk"
              type="number"
              min={1}
              max={20}
              value={answers.knowledge?.retrievalConfig?.topK || 5}
              onChange={(e) => updateAnswers({
                knowledge: {
                  ...answers.knowledge!,
                  sources: selectedSources,
                  retrievalConfig: {
                    ...answers.knowledge?.retrievalConfig!,
                    topK: Number(e.target.value)
                  }
                }
              })}
              className="w-full bg-[#0A0A0B] border border-[#262626] rounded-md px-3 py-2 text-sm text-[#EDEDED]"
            />
          </div>
          <div>
            <label htmlFor="similarity" className="text-xs text-[#A1A1A1] mb-1 block">Similarity Threshold</label>
            <input
              id="similarity"
              name="similarity"
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={answers.knowledge?.retrievalConfig?.similarityThreshold || 0.7}
              onChange={(e) => updateAnswers({
                knowledge: {
                  ...answers.knowledge!,
                  sources: selectedSources,
                  retrievalConfig: {
                    ...answers.knowledge?.retrievalConfig!,
                    similarityThreshold: Number(e.target.value)
                  }
                }
              })}
              className="w-full bg-[#0A0A0B] border border-[#262626] rounded-md px-3 py-2 text-sm text-[#EDEDED]"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#FEF3C7]/10 border border-[#FEF3C7]/20 rounded-lg p-4">
        <p className="text-sm text-[#FEF3C7]">
          <strong>Note:</strong> Knowledge sources will be queried during agent conversations to provide context-aware responses. Documents you select here will be accessible to your agent at runtime.
        </p>
      </div>
    </div>
  );
}
