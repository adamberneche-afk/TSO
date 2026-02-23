import React, { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2, Loader2, ShieldCheck, Database, HardDrive, FolderOpen, FileUp } from 'lucide-react';
import { usePrivateRAG } from '../../../hooks/useRAG';
import { getPrivateRAG } from '../../../services/rag/privateRAG';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import type { Document } from '../../../types/rag';

const STORAGE_KEY = 'tais_private_rag_directory';

export const PrivateRAGManager: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { documents, stats, isUploading, uploadDocument, deleteDocument, clearAll } = usePrivateRAG();
  const [uploadProgress, setUploadProgress] = useState<{ status: string; progress: number } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [storageDir, setStorageDir] = useState<FileSystemDirectoryHandle | null>(null);
  const [storageMode, setStorageMode] = useState<'browser' | 'local'>('browser');

  const chooseLocalFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      toast.error('Your browser does not support folder selection. Try Chrome or Edge.');
      return;
    }
    
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      
      // Store permission for future use
      if (await dirHandle.queryPermission({ mode: 'readwrite' }) === 'granted') {
        localStorage.setItem(STORAGE_KEY, dirHandle.name);
        setStorageDir(dirHandle);
        setStorageMode('local');
        toast.success(`Using folder: ${dirHandle.name}`);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to choose folder:', err);
        toast.error('Failed to access folder');
      }
    }
  };

  const exportToLocal = async () => {
    if (!documents.length) {
      toast.error('No documents to export');
      return;
    }

    const dir = storageDir || await chooseLocalFolder();
    if (!dir) return;

    try {
      for (const doc of documents) {
        const fileName = `${doc.id}.json`;
        const fileHandle = await dir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(doc, null, 2));
        await writable.close();
      }
      toast.success(`Exported ${documents.length} documents`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed');
    }
  };

  const importFromLocal = async () => {
    const dir = storageDir || await chooseLocalFolder();
    if (!dir) return;

    try {
      let imported = 0;
      for await (const entry of (dir as any).values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          const file = await entry.getFile();
          const content = await file.text();
          const doc = JSON.parse(content);
          
          const rag = getPrivateRAG();
          await rag.addDocument(doc.content, doc.metadata);
          imported++;
        }
      }
      toast.success(`Imported ${imported} documents`);
    } catch (err) {
      console.error('Import failed:', err);
      toast.error('Import failed');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    try {
      setUploadProgress({ status: 'starting', progress: 0 });
      await uploadDocument(file, (progress) => {
        setUploadProgress(progress);
      });
      toast.success(`Indexed ${file.name}`);
    } catch (error) {
      toast.error('Failed to index document');
      console.error(error);
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header & Stats */}
      <div className="bg-[#141415] border border-[#262626] rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/5 border border-[#262626] rounded-md text-[#4ADE80]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tightest uppercase tracking-widest">Local Knowledge Base</h2>
            {!isInitialized && !initError && (
              <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" />
            )}
            {initError && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Error
              </span>
            )}
          </div>
          <p className="text-xs text-[#A1A1A1] uppercase tracking-widest leading-relaxed">
            {initError 
              ? `Error: ${initError}` 
              : 'Personal documents stored exclusively in browser IndexedDB.'}
          </p>
        </div>
        <div className="flex gap-8">
          <StatItem label="Documents" value={documents.length.toString()} />
          <StatItem label="Chunks" value={(stats?.chunkCount || 0).toString()} />
          <StatItem label="Storage" value={formatFileSize(stats?.storageUsed || 0)} />
        </div>
      </div>

      {/* Storage Mode Toggle */}
      <div className="bg-[#141415] border border-[#262626] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-[#888888]">Storage:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setStorageMode('browser')}
              className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-2 transition-all ${
                storageMode === 'browser' 
                  ? 'bg-[#3B82F6] text-white' 
                  : 'bg-[#252525] text-[#888888] hover:text-white'
              }`}
            >
              <HardDrive className="w-3 h-3" /> Browser
            </button>
            <button
              onClick={chooseLocalFolder}
              className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-2 transition-all ${
                storageMode === 'local' 
                  ? 'bg-[#4ADE80] text-black' 
                  : 'bg-[#252525] text-[#888888] hover:text-white'
              }`}
            >
              <FolderOpen className="w-3 h-3" /> Local Folder
            </button>
          </div>
        </div>
        {storageMode === 'local' && documents.length > 0 && (
          <button
            onClick={exportToLocal}
            className="text-xs text-[#4ADE80] hover:underline flex items-center gap-1"
          >
            <FileUp className="w-3 h-3" /> Export to folder
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Column */}
        <div className="space-y-6">
          <div className="bg-[#141415] border border-[#262626] p-6 rounded-lg">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#3B82F6] mb-6 flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" /> Ingest Knowledge
            </h3>
            
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group border border-dashed border-[#262626] rounded-lg p-8 text-center hover:border-[#3B82F6]/50 hover:bg-white/[0.02] transition-all cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.json,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-10 h-10 bg-[#0A0A0B] border border-[#262626] rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:border-[#3B82F6]/50 transition-all">
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#3B82F6]" />
                  ) : (
                    <Upload className="w-5 h-5 text-[#717171]" />
                  )}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white mb-2">
                  {isUploading ? 'INDEXING...' : 'DROP FILES OR CLICK'}
                </div>
                <p className="text-[9px] text-[#717171] uppercase tracking-widest">
                  TXT, MD, JSON, PDF (MAX 10MB)
                </p>
              </div>

              {uploadProgress && (
                <div className="space-y-3 p-4 bg-[#0A0A0B] border border-[#262626] rounded-lg">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                    <span className="text-[#3B82F6] font-bold">{uploadProgress.status}...</span>
                    <span className="font-mono">{uploadProgress.progress}%</span>
                  </div>
                  <div className="h-1 bg-[#262626] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-300" 
                      style={{ width: `${uploadProgress.progress}%` }} 
                    />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-[#3B82F6]/5 border border-[#3B82F6]/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-[#3B82F6] mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-[#A1A1A1] uppercase tracking-widest leading-relaxed">
                  Encryption is not required for local RAG as data never leaves your device.
                </p>
              </div>
            </div>
          </div>

          {documents.length > 0 && (
            <button
              onClick={clearAll}
              className="w-full bg-transparent border border-red-500/30 text-red-500/70 hover:bg-red-500/5 py-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              PURGE KNOWLEDGE BASE
            </button>
          )}
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#141415] border border-[#262626] rounded-lg overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-[#262626] bg-[#141415]/50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-[#A1A1A1]" /> Index Registry
              </h3>
              <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-[#262626] font-mono">
                {documents.length} ENTRIES
              </Badge>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                <AnimatePresence mode="popLayout">
                  {documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                      <Database className="w-12 h-12 mb-4" />
                      <p className="text-xs uppercase tracking-widest font-bold">Registry Empty</p>
                    </div>
                  ) : (
                    documents.map((doc: Document, idx) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-center justify-between p-4 bg-[#0A0A0B] border border-[#262626] rounded-lg hover:border-[#3B82F6]/30 group transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-[#141415] border border-[#262626] rounded flex items-center justify-center">
                            <FileText className="w-4 h-4 text-[#717171] group-hover:text-[#3B82F6] transition-colors" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm tracking-tightest truncate text-[#EDEDED]">{doc.metadata.title}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[9px] font-mono uppercase tracking-widest text-[#717171] border border-[#262626] px-1.5 py-0.5 rounded bg-[#141415]">
                                {doc.metadata.type}
                              </span>
                              <span className="text-[9px] font-mono uppercase tracking-widest text-[#717171]">{formatFileSize(doc.metadata.size)}</span>
                              <div className="w-1 h-1 rounded-full bg-[#262626]" />
                              <span className="text-[9px] font-mono uppercase tracking-widest text-[#717171]">{doc.chunkCount} CHUNKS</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[9px] uppercase tracking-[0.2em] text-[#717171] font-bold mb-1">{label}</div>
      <div className="text-lg font-bold tracking-tightest text-white">{value}</div>
    </div>
  );
}

export default PrivateRAGManager;
