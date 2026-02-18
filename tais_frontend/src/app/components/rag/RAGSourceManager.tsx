import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Database, Globe, Building2, AppWindow, HardDrive, RefreshCw } from 'lucide-react';
import { useRAG } from '../../../hooks/useRAG';
import { useRAGStore } from '../../../hooks/useRAG';

const sourceIcons: Record<string, React.ReactNode> = {
  private: <HardDrive className="w-5 h-5" />,
  public: <Globe className="w-5 h-5" />,
  app: <AppWindow className="w-5 h-5" />,
  enterprise: <Building2 className="w-5 h-5" />
};

const sourceColors: Record<string, string> = {
  private: 'bg-blue-100 text-blue-800',
  public: 'bg-green-100 text-green-800',
  app: 'bg-purple-100 text-purple-800',
  enterprise: 'bg-orange-100 text-orange-800'
};

export const RAGSourceManager: React.FC = () => {
  const { sources, setSourceEnabled, setSourceWeight, refreshSources } = useRAG();
  const [weights, setWeights] = useState<Record<string, number>>({});

  const handleWeightChange = useCallback((sourceId: string, weight: number) => {
    setWeights(prev => ({ ...prev, [sourceId]: weight }));
  }, []);

  const handleWeightCommit = useCallback((sourceId: string) => {
    const weight = weights[sourceId];
    if (weight !== undefined) {
      setSourceWeight(sourceId, weight);
    }
  }, [weights, setSourceWeight]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Knowledge Sources
            </CardTitle>
            <CardDescription>
              Enable and configure RAG sources for context retrieval
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshSources}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {sources.map((source) => (
          <div key={source.id} className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${sourceColors[source.tier]}`}>
                  {sourceIcons[source.tier]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{source.name}</h4>
                    <Badge variant="outline" className={sourceColors[source.tier]}>
                      {source.tier}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{source.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{source.documentCount} documents</span>
                    <span>Last updated: {new Date(source.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <Switch
                checked={source.enabled}
                onCheckedChange={(checked) => setSourceEnabled(source.id, checked)}
              />
            </div>

            {source.enabled && (
              <div className="space-y-2 pl-12">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Relevance Weight</Label>
                  <span className="text-sm font-medium">
                    {weights[source.id] ?? 1.0}x
                  </span>
                </div>
                <Slider
                  value={[weights[source.id] ?? 1.0]}
                  onValueChange={([value]) => handleWeightChange(source.id, value)}
                  onValueCommit={() => handleWeightCommit(source.id)}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                />
                <p className="text-xs text-gray-500">
                  Higher weight = more priority in results
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RAGSourceManager;
