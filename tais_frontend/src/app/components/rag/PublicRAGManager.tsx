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
import { Globe, Lock, Upload, Search, Share2, Trash2, FileText, Users, Key } from 'lucide-react';
import { usePublicRAG, usePublicRAGUpload } from '../../../hooks/usePublicRAG';
import { toast } from 'sonner';
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
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Initializing Public RAG...</p>
          <p className="text-sm text-gray-500 mt-2">Please sign the message in your wallet</p>
        </CardContent>
      </Card>
    );
  }

  if (!isInitialized) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Globe className="w-12 h-12 mx-auto mb-4 text-blue-500" />
          <h3 className="text-lg font-medium mb-2">Connect to Public RAG</h3>
          <p className="text-gray-600 mb-4">
            Share knowledge with the community using end-to-end encryption
          </p>
          <Button onClick={() => window.location.reload()}>
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
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
    } catch (error) {
      // Error handled in hook
    }
  };

  const copyPublicKey = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      toast.success('Public key copied to clipboard');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Community Knowledge Base
            </CardTitle>
            <CardDescription>
              Share and discover knowledge with E2EE protection
            </CardDescription>
          </div>
          {stats && (
            <div className="text-right text-sm">
              <p className="text-gray-600">{stats.myDocuments} my docs</p>
              <p className="text-gray-500">{stats.totalDocuments} total</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="my-docs">My Docs</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="Document title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={uploadForm.content}
                  onChange={(e) => setUploadForm({ ...uploadForm, content: e.target.value })}
                  placeholder="Document content..."
                  rows={6}
                  required
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  placeholder="react, javascript, tutorial"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="public"
                    checked={uploadForm.isPublic}
                    onCheckedChange={(checked) => setUploadForm({ ...uploadForm, isPublic: checked })}
                  />
                  <Label htmlFor="public" className="flex items-center gap-2">
                    {uploadForm.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {uploadForm.isPublic ? 'Public (anyone can view)' : 'Private (only you)'}
                  </Label>
                </div>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center text-gray-500">
                    Encrypting and uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </form>

            {/* Public Key Section */}
            <div className="p-4 bg-gray-50 rounded-lg mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Your Public Key
                </Label>
                <Button variant="ghost" size="sm" onClick={copyPublicKey}>
                  Copy
                </Button>
              </div>
              <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                {publicKey}
              </code>
              <p className="text-xs text-gray-500 mt-2">
                Share this key with others to let them share documents with you
              </p>
            </div>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search community knowledge..."
                className="flex-1"
              />
              <Button type="submit" disabled={isSearching}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </form>

            {isSearching && (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Searching encrypted index...</p>
              </div>
            )}

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Enter a query to search</p>
                    <p className="text-sm">Results are decrypted client-side</p>
                  </div>
                )}

                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{result.decrypted?.metadata?.title}</h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {result.decrypted?.content?.slice(0, 200)}...
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            Score: {(result.score * 100).toFixed(1)}%
                          </Badge>
                          {result.decrypted?.metadata?.tags?.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* My Documents Tab */}
          <TabsContent value="my-docs" className="space-y-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No documents yet</p>
                    <p className="text-sm">Upload your first document</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">Document {doc.id.slice(0, 8)}</span>
                            {doc.isPublic ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                <Globe className="w-3 h-3 mr-1" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-100">
                                <Lock className="w-3 h-3 mr-1" />
                                Private
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                            <span>{doc.chunkCount} chunks</span>
                            <span>•</span>
                            <span>{doc.tags.join(', ')}</span>
                            <span>•</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDocument(doc.id)}
                            className="text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {selectedDoc === doc.id && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <Label className="text-sm">Share with (public key):</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              value={shareKey}
                              onChange={(e) => setShareKey(e.target.value)}
                              placeholder="Paste recipient's public key..."
                              className="text-xs"
                            />
                            <Button size="sm" onClick={() => handleShare(doc.id)}>
                              Share
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-sm text-gray-600">
                  {communityDocuments.length} public documents
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={refresh}>
                Refresh
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {communityDocuments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No public documents yet</p>
                    <p className="text-sm">Be the first to share!</p>
                  </div>
                ) : (
                  communityDocuments.map((doc: CommunityDocument) => (
                    <div
                      key={doc.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{doc.title}</h4>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <span>By {doc.author.slice(0, 6)}...{doc.author.slice(-4)}</span>
                            <span>•</span>
                            <span>{doc.downloadCount} downloads</span>
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            {doc.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {!doc.canAccess && (
                          <Badge variant="outline">No Access</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PublicRAGManager;
