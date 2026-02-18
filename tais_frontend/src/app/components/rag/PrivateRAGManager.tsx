import React, { useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { usePrivateRAG } from '../../../hooks/useRAG';
import { toast } from 'sonner';
import type { Document } from '../../../types/rag';

export const PrivateRAGManager: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { documents, stats, isUploading, uploadDocument, deleteDocument, clearAll } = usePrivateRAG();
  const [uploadProgress, setUploadProgress] = useState<{ status: string; progress: number } | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    try {
      setUploadProgress({ status: 'starting', progress: 0 });
      
      await uploadDocument(file, (progress) => {
        setUploadProgress(progress);
      });

      toast.success(`Uploaded ${file.name}`);
    } catch (error) {
      toast.error('Failed to upload document');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
      case 'chunking':
      case 'embedding':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Private Knowledge Base
            </CardTitle>
            <CardDescription>
              Upload personal documents for AI context (stored locally)
            </CardDescription>
          </div>
          <div className="text-right text-sm">
            <p className="text-gray-600">{documents.length} documents</p>
            <p className="text-gray-500">{stats?.chunkCount || 0} chunks</p>
            <p className="text-gray-500">{formatFileSize(stats?.storageUsed || 0)} used</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Supports: TXT, MD, JSON, PDF (max 10MB)
          </p>
        </div>

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="capitalize">{uploadProgress.status}...</span>
              <span>{uploadProgress.progress}%</span>
            </div>
            <Progress value={uploadProgress.progress} />
          </div>
        )}

        {/* Document List */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No documents yet</p>
                <p className="text-sm">Upload your first document to get started</p>
              </div>
            ) : (
              documents.map((doc: Document) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{doc.metadata.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Badge variant="outline" className="text-xs">
                          {doc.metadata.type}
                        </Badge>
                        <span>{formatFileSize(doc.metadata.size)}</span>
                        <span>•</span>
                        <span>{doc.chunkCount} chunks</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDocument(doc.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Clear All */}
        {documents.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="w-full text-red-500 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Documents
          </Button>
        )}

        {/* Privacy Notice */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Documents are stored locally in your browser using IndexedDB. 
            They are never uploaded to any server.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrivateRAGManager;
