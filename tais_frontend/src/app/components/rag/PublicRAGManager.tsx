import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Globe, Lock, Upload, Search, Share2, Trash2, FileText, Users, Key, Database, Shield } from 'lucide-react';
import { usePublicRAG, usePublicRAGUpload } from '../../../hooks/usePublicRAG';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import type { CommunityDocument } from '../../../types/rag-public';

export const PublicRAGManager: React.FC = () => {
  const {
    isInitialized,
    isAuthenticating,
    isSearching,
    searchResults,
    performSearch,
    documents,
    communityDocuments,
    stats,
    publicKey,
    shareDocument,
    deleteDocument,
    refresh
  } = usePublicRAG();

  const { upload, isUploading, uploadProgress } = usePublicRAGUpload();
  
  const [uploadForm, setUploadForm] = useState({
    title: '',
    content: '',
    isPublic: false,
    tags: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [shareKey, setShareKey] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  if (isAuthenticating) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-in fade-in duration-500">
        <div className="w-12 h-12 relative mb-6">
          <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-xl font-bold tracking-tightest mb-2">Initializing Public RAG</h2>
        <p className="text-[#A1A1A1] text-sm uppercase tracking-widest">Sign authentication request in wallet</p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-[#141415] border border-[#262626] rounded-lg text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="w-16 h-16 bg-[#0A0A0B] border border-[#262626] rounded-xl flex items-center justify-center mx-auto mb-6">
          <Globe className="w-8 h-8 text-[#3B82F6]" />
        </div>
        <h2 className="text-2xl font-bold tracking-tightest mb-3">Connect to Public RAG</h2>
        <p className="text-[#A1A1A1] text-sm leading-relaxed mb-8">
          Share knowledge with the community using end-to-end encryption. 
          Your plaintext data never touches our servers.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-md hover:bg-white/90 transition-all active:scale-95"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.content) return;

    try {
      await upload(
        uploadForm.title,
        uploadForm.content,
        uploadForm.isPublic,
        uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      );
      setUploadForm({ title: '', content: '', isPublic: false, tags: '' });
      refresh();
      toast.success('Document uploaded successfully');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    await performSearch(searchQuery);
  };

  const handleShare = async (docId: string) => {
    if (!shareKey) {
      toast.error('Please enter a recipient public key');
      return;
    }
    try {
      await shareDocument(docId, shareKey);
      setShareKey('');
      setSelectedDoc(null);
      toast.success('Document shared successfully');
    } catch (error) {
      toast.error('Failed to share document');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={<Database className="w-4 h-4" />} label="Storage" value={stats?.storageUsedFormatted ?? '...'} subvalue={`Limit: ${stats?.storageLimitFormatted ?? '...'}`} />
        <StatsCard icon={<Shield className="w-4 h-4" />} label="Documents" value={stats?.documentCount?.toString() ?? '0'} subvalue="Personal + Shared" />
        <StatsCard icon={<Users className="w-4 h-4" />} label="Community" value={communityDocuments.length.toString()} subvalue="Public Knowledge" />
        <div className="bg-[#141415] border border-[#262626] p-4 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-widest text-[#717171] font-bold">Public Key</label>
            <Key className="w-3 h-3 text-[#3B82F6]" />
          </div>
          <div className="flex gap-2">
            <code className="text-[10px] bg-[#0A0A0B] p-1.5 rounded border border-[#262626] flex-1 truncate text-[#3B82F6]">
              {publicKey}
            </code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(publicKey || '');
                toast.success('Public key copied');
              }}
              className="p-1.5 hover:bg-white/5 rounded border border-[#262626] transition-colors"
            >
              <FileText className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="bg-[#141415] border border-[#262626] p-1 h-auto mb-6">
          <TabsTrigger value="search" className="px-6 py-2 text-xs uppercase tracking-widest font-bold data-[state=active]:bg-white/5 data-[state=active]:text-white">
            <Search className="w-3 h-3 mr-2" /> Search
          </TabsTrigger>
          <TabsTrigger value="upload" className="px-6 py-2 text-xs uppercase tracking-widest font-bold data-[state=active]:bg-white/5 data-[state=active]:text-white">
            <Upload className="w-3 h-3 mr-2" /> Upload
          </TabsTrigger>
          <TabsTrigger value="my-docs" className="px-6 py-2 text-xs uppercase tracking-widest font-bold data-[state=active]:bg-white/5 data-[state=active]:text-white">
            <Lock className="w-3 h-3 mr-2" /> My Docs
          </TabsTrigger>
          <TabsTrigger value="community" className="px-6 py-2 text-xs uppercase tracking-widest font-bold data-[state=active]:bg-white/5 data-[state=active]:text-white">
            <Users className="w-3 h-3 mr-2" /> Community
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <div className="bg-[#141415] border border-[#262626] p-6 rounded-lg">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717171]" />
                <input
                  type="text"
                  placeholder="SEARCH KNOWLEDGE BASE..."
                  className="w-full bg-[#0A0A0B] border border-[#262626] rounded-md pl-10 pr-4 py-3 text-sm focus:border-[#3B82F6] outline-none uppercase tracking-widest font-mono"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={isSearching}
                className="bg-white text-black px-8 font-bold text-xs uppercase tracking-widest rounded-md hover:bg-white/90 disabled:opacity-50"
              >
                {isSearching ? 'SEARCHING...' : 'QUERY'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {searchResults.length > 0 ? (
                searchResults.map((result, idx) => (
                  <motion.div
                    key={`${result.documentId}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[#141415] border border-[#262626] rounded-lg overflow-hidden group hover:border-[#3B82F6]/50 transition-all"
                  >
                    <div className="p-4 flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#0A0A0B] border border-[#262626] rounded flex items-center justify-center">
                            <FileText className="w-4 h-4 text-[#3B82F6]" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm tracking-tightest">Result Chunk #{idx + 1}</h4>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[9px] uppercase tracking-widest font-bold text-[#717171]">Score: {(result.score * 100).toFixed(1)}%</span>
                              <span className="text-[9px] uppercase tracking-widest font-bold text-[#3B82F6]">Public Document</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-[#09090B] p-4 rounded border border-[#262626] font-mono text-xs leading-relaxed text-[#EDEDED]">
                          {result.content}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : searchQuery && !isSearching && (
                <div className="text-center py-20 border border-[#262626] rounded-lg bg-[#141415]/50">
                  <p className="text-[#717171] uppercase tracking-widest text-xs">No matching knowledge found</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#141415] border border-[#262626] p-6 rounded-lg">
                <form onSubmit={handleUpload} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#717171] font-bold">Document Title</label>
                    <input
                      type="text"
                      className="w-full bg-[#0A0A0B] border border-[#262626] rounded-md px-4 py-3 text-sm focus:border-[#3B82F6] outline-none"
                      placeholder="ENTER DOCUMENT NAME..."
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#717171] font-bold">Knowledge Content</label>
                    <textarea
                      className="w-full h-64 bg-[#0A0A0B] border border-[#262626] rounded-md px-4 py-3 text-sm focus:border-[#3B82F6] outline-none font-mono resize-none"
                      placeholder="PASTE OR TYPE KNOWLEDGE HERE..."
                      value={uploadForm.content}
                      onChange={(e) => setUploadForm({ ...uploadForm, content: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-[#717171] font-bold">Tags (Comma separated)</label>
                      <input
                        type="text"
                        className="w-full bg-[#0A0A0B] border border-[#262626] rounded-md px-4 py-3 text-sm focus:border-[#3B82F6] outline-none"
                        placeholder="AI, RAG, ETH..."
                        value={uploadForm.tags}
                        onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                      />
                    </div>
                    <div className="bg-[#0A0A0B] border border-[#262626] rounded-lg p-4 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-[10px] uppercase tracking-widest text-white font-bold">Public Sharing</label>
                        <p className="text-[10px] text-[#717171] uppercase tracking-widest">Share with community</p>
                      </div>
                      <Switch
                        checked={uploadForm.isPublic}
                        onCheckedChange={(checked) => setUploadForm({ ...uploadForm, isPublic: checked })}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-md hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin w-3 h-3 border border-black border-t-transparent rounded-full" />
                        UPLOADING ({uploadProgress}%)
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3" />
                        COMMIT TO KNOWLEDGE BASE
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[#141415] border border-[#262626] p-6 rounded-lg">
                <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#3B82F6] mb-4">Encryption Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs">
                    <Shield className="w-4 h-4 text-[#4ADE80]" />
                    <span className="text-[#A1A1A1] uppercase tracking-widest">ECIES (P-384) Active</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Lock className="w-4 h-4 text-[#4ADE80]" />
                    <span className="text-[#A1A1A1] uppercase tracking-widest">Client-Side Chunking</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Globe className="w-4 h-4 text-[#3B82F6]" />
                    <span className="text-[#A1A1A1] uppercase tracking-widest">Zero-Knowledge Search</span>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-[#262626]">
                  <p className="text-[10px] text-[#717171] leading-relaxed uppercase tracking-widest">
                    All documents are encrypted with your wallet signature before leaving the browser. 
                    TAIS cannot read your knowledge.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* My Docs Tab */}
        <TabsContent value="my-docs">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-[#141415] border border-[#262626] rounded-lg p-4 hover:border-[#3B82F6]/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-8 h-8 bg-[#0A0A0B] border border-[#262626] rounded flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#3B82F6]" />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedDoc(doc.id)}
                        className="p-1.5 hover:bg-[#3B82F6]/10 rounded border border-[#262626] transition-colors"
                      >
                        <Share2 className="w-3 h-3 text-[#3B82F6]" />
                      </button>
                      <button 
                        onClick={() => deleteDocument(doc.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded border border-[#262626] transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-bold text-sm tracking-tightest mb-1 truncate">{doc.title || 'Untitled'}</h4>
                  <p className="text-[10px] text-[#717171] uppercase tracking-widest mb-4">
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Unknown date'} • {doc.size ? (doc.size / 1024).toFixed(1) : 0} KB
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(doc.tags || []).map(tag => (
                      <span key={tag} className="text-[8px] uppercase tracking-tighter bg-[#0A0A0B] border border-[#262626] px-1.5 py-0.5 rounded text-[#A1A1A1]">
                        {tag}
                      </span>
                    ))}
                    {doc.isPublic && (
                      <span className="text-[8px] uppercase tracking-tighter bg-[#3B82F6]/10 border border-[#3B82F6]/30 px-1.5 py-0.5 rounded text-[#3B82F6]">
                        Public
                      </span>
                    )}
                  </div>

                  {selectedDoc === doc.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 pt-4 border-t border-[#262626] space-y-3"
                    >
                      <label className="text-[9px] uppercase tracking-widest text-[#717171] font-bold">Recipient Public Key</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 bg-[#0A0A0B] border border-[#262626] rounded-md px-2 py-1.5 text-[10px] focus:border-[#3B82F6] outline-none"
                          placeholder="PASTE KEY..."
                          value={shareKey}
                          onChange={(e) => setShareKey(e.target.value)}
                        />
                        <button 
                          onClick={() => handleShare(doc.id)}
                          className="bg-white text-black px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-white/90"
                        >
                          SHARE
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {documents.length === 0 && (
              <div className="col-span-full py-20 text-center border border-dashed border-[#262626] rounded-lg">
                <p className="text-[#717171] text-xs uppercase tracking-widest">No documents found in knowledge base</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Community Tab */}
        <TabsContent value="community">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communityDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-[#141415] border border-[#262626] rounded-lg p-4 hover:border-[#3B82F6]/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-8 h-8 bg-[#0A0A0B] border border-[#262626] rounded flex items-center justify-center">
                    <Globe className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <Badge variant="outline" className="text-[8px] uppercase tracking-widest border-[#262626]">
                    Shared
                  </Badge>
                </div>
                <h4 className="font-bold text-sm tracking-tightest mb-1 truncate">{doc.title || 'UNNAMED KNOWLEDGE'}</h4>
                <p className="text-[10px] text-[#717171] uppercase tracking-widest mb-4">
                  By {doc.author || 'Unknown'}
                </p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {(doc.tags || []).map(tag => (
                    <span key={tag} className="text-[8px] uppercase tracking-tighter bg-[#0A0A0B] border border-[#262626] px-1.5 py-0.5 rounded text-[#A1A1A1]">
                      {tag}
                    </span>
                  ))}
                </div>
                <button className="w-full bg-transparent border border-[#262626] text-white py-2 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
                  INDEX TO AGENT
                </button>
              </div>
            ))}
            {communityDocuments.length === 0 && (
              <div className="col-span-full py-20 text-center border border-dashed border-[#262626] rounded-lg">
                <p className="text-[#717171] text-xs uppercase tracking-widest">No public community documents available</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function StatsCard({ icon, label, value, subvalue }: { icon: React.ReactNode; label: string; value: string; subvalue: string }) {
  return (
    <div className="bg-[#141415] border border-[#262626] p-4 rounded-lg flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] uppercase tracking-widest text-[#717171] font-bold">{label}</label>
        <div className="text-[#3B82F6]">{icon}</div>
      </div>
      <div>
        <div className="text-xl font-bold tracking-tightest">{value}</div>
        <div className="text-[9px] uppercase tracking-widest text-[#717171] font-bold mt-0.5">{subvalue}</div>
      </div>
    </div>
  );
}

export default PublicRAGManager;
