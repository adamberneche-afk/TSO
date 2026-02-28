'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Key, 
  Database, 
  Brain, 
  DollarSign, 
  Shield, 
  FolderOpen, 
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bell,
  HardDrive,
  Zap,
  MessageSquare,
  FileText,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';
import { LLM_PROVIDERS, type LLMProvider } from '@/types/llm';

interface AppModelPreference {
  appId: string;
  appName: string;
  preferredModel: string;
}

interface CostLimit {
  dailyLimit: number;
  monthlyLimit: number;
  alertThreshold: number;
}

interface PlatformSettings {
  memoryReports: {
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'never';
    includeDriftStats: boolean;
    includeUsagePatterns: boolean;
    includeAppUsage: boolean;
    includeRagPools: boolean;
    includeAlignmentIndex: boolean;
    notifyOnFlag: boolean;
    notifyOnDrift: boolean;
  };
  privateRag: {
    folderPath: string | null;
  };
  immutableMemory: {
    backupFolderPath: string | null;
  };
  modelPreferences: AppModelPreference[];
  costLimits: CostLimit;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  memoryReports: {
    frequency: 'weekly',
    includeDriftStats: true,
    includeUsagePatterns: true,
    includeAppUsage: true,
    includeRagPools: true,
    includeAlignmentIndex: true,
    notifyOnFlag: true,
    notifyOnDrift: true,
  },
  privateRag: {
    folderPath: null,
  },
  immutableMemory: {
    backupFolderPath: null,
  },
  modelPreferences: [
    { appId: 'conversation', appName: 'Conversation', preferredModel: 'gpt-4o' },
    { appId: 'interview', appName: 'Guided Discovery', preferredModel: 'gpt-4o' },
    { appId: 'rag', appName: 'RAG Search', preferredModel: 'gpt-4o-mini' },
    { appId: 'memory', appName: 'Memory/Reflection', preferredModel: 'gpt-4o-mini' },
  ],
  costLimits: {
    dailyLimit: 50,
    monthlyLimit: 500,
    alertThreshold: 80,
  },
};

const STORAGE_KEY = 'tais_platform_settings';

export function PlatformSettingsPage({ onBack }: { onBack: () => void }) {
  const { isConnected, wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
    loadApiKeys();
  }, []);

  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const loadApiKeys = () => {
    try {
      const stored = localStorage.getItem('tais_llm_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setApiKeys(parsed);
      }
    } catch (e) {
      console.error('Failed to load API keys:', e);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      
      if (isConnected && wallet.signer) {
        try {
          const token = localStorage.getItem('auth_token');
          if (token) {
            await fetch('https://tso.onrender.com/api/v1/auth/memory-preferences', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                reportFrequency: settings.memoryReports.frequency,
                includeDriftStats: settings.memoryReports.includeDriftStats,
                includeUsagePatterns: settings.memoryReports.includeUsagePatterns,
                includeAppUsage: settings.memoryReports.includeAppUsage,
                includeRagPools: settings.memoryReports.includeRagPools,
                includeAlignmentIndex: settings.memoryReports.includeAlignmentIndex,
                notifyOnFlag: settings.memoryReports.notifyOnFlag,
                notifyOnDrift: settings.memoryReports.notifyOnDrift,
              }),
            });
          }
        } catch (e) {
          console.warn('Failed to sync with backend:', e);
        }
      }
      
      toast.success('Settings saved');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateMemoryReports = (key: keyof PlatformSettings['memoryReports'], value: any) => {
    setSettings(prev => ({
      ...prev,
      memoryReports: { ...prev.memoryReports, [key]: value },
    }));
  };

  const updateModelPreference = (appId: string, model: string) => {
    setSettings(prev => ({
      ...prev,
      modelPreferences: prev.modelPreferences.map(p => 
        p.appId === appId ? { ...p, preferredModel: model } : p
      ),
    }));
  };

  const updateCostLimits = (key: keyof PlatformSettings['costLimits'], value: number) => {
    setSettings(prev => ({
      ...prev,
      costLimits: { ...prev.costLimits, [key]: value },
    }));
  };

  const handlePrivateRagFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      toast.error('Browser does not support folder selection');
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setSettings(prev => ({
        ...prev,
        privateRag: { folderPath: dirHandle.name },
      }));
      toast.success(`Folder selected: ${dirHandle.name}`);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        toast.error('Failed to select folder');
      }
    }
  };

  const handleImmutableMemoryFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      toast.error('Browser does not support folder selection');
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setSettings(prev => ({
        ...prev,
        immutableMemory: { backupFolderPath: dirHandle.name },
      }));
      toast.success(`Folder selected: ${dirHandle.name}`);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        toast.error('Failed to select folder');
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="w-8 h-8" />
              Platform Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure your TAIS platform experience
            </p>
          </div>
          <Button onClick={onBack} variant="outline">
            Back
          </Button>
        </div>

        <Tabs defaultValue="memory" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="memory" className="gap-1">
              <Brain className="w-4 h-4" />
              Memory
            </TabsTrigger>
            <TabsTrigger value="storage" className="gap-1">
              <HardDrive className="w-4 h-4" />
              Storage
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-1">
              <Zap className="w-4 h-4" />
              Models
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-1">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="costs" className="gap-1">
              <DollarSign className="w-4 h-4" />
              Costs
            </TabsTrigger>
          </TabsList>

          {/* Memory Reports Settings */}
          <TabsContent value="memory">
            <Card className="bg-[#141415] border-[#262626]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-500" />
                  Memory Reports
                </CardTitle>
                <CardDescription>
                  Configure your weekly memory alignment reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Report Frequency</Label>
                  <Select 
                    value={settings.memoryReports.frequency}
                    onValueChange={(v) => updateMemoryReports('frequency', v)}
                  >
                    <SelectTrigger className="w-[200px] bg-[#0A0A0B] border-[#262626]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141415] border-[#262626]">
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label>Include in Report</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-[#0A0A0B] rounded-lg">
                      <div>
                        <div className="text-sm">Alignment Index</div>
                        <div className="text-xs text-muted-foreground">Your overall AI alignment score</div>
                      </div>
                      <Switch 
                        checked={settings.memoryReports.includeAlignmentIndex}
                        onCheckedChange={(v) => updateMemoryReports('includeAlignmentIndex', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#0A0A0B] rounded-lg">
                      <div>
                        <div className="text-sm">Drift Statistics</div>
                        <div className="text-xs text-muted-foreground">Memory alignment drift over time</div>
                      </div>
                      <Switch 
                        checked={settings.memoryReports.includeDriftStats}
                        onCheckedChange={(v) => updateMemoryReports('includeDriftStats', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#0A0A0B] rounded-lg">
                      <div>
                        <div className="text-sm">Usage Patterns</div>
                        <div className="text-xs text-muted-foreground">Session count, duration, messages</div>
                      </div>
                      <Switch 
                        checked={settings.memoryReports.includeUsagePatterns}
                        onCheckedChange={(v) => updateMemoryReports('includeUsagePatterns', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#0A0A0B] rounded-lg">
                      <div>
                        <div className="text-sm">App Usage</div>
                        <div className="text-xs text-muted-foreground">Which apps you use most</div>
                      </div>
                      <Switch 
                        checked={settings.memoryReports.includeAppUsage}
                        onCheckedChange={(v) => updateMemoryReports('includeAppUsage', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#0A0A0B] rounded-lg">
                      <div>
                        <div className="text-sm">RAG Pools</div>
                        <div className="text-xs text-muted-foreground">Knowledge base queries</div>
                      </div>
                      <Switch 
                        checked={settings.memoryReports.includeRagPools}
                        onCheckedChange={(v) => updateMemoryReports('includeRagPools', v)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Notifications</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-[#0A0A0B] rounded-lg">
                      <div>
                        <div className="text-sm">Flag Alerts</div>
                        <div className="text-xs text-muted-foreground">Notify when alignment is flagged</div>
                      </div>
                      <Switch 
                        checked={settings.memoryReports.notifyOnFlag}
                        onCheckedChange={(v) => updateMemoryReports('notifyOnFlag', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#0A0A0B] rounded-lg">
                      <div>
                        <div className="text-sm">Drift Alerts</div>
                        <div className="text-xs text-muted-foreground">Notify on significant drift</div>
                      </div>
                      <Switch 
                        checked={settings.memoryReports.notifyOnDrift}
                        onCheckedChange={(v) => updateMemoryReports('notifyOnDrift', v)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage Settings */}
          <TabsContent value="storage">
            <div className="space-y-6">
              <Card className="bg-[#141415] border-[#262626]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-green-500" />
                    Private RAG Storage
                  </CardTitle>
                  <CardDescription>
                    Choose a local folder to store your private RAG documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-4 bg-[#0A0A0B] rounded-lg border border-[#262626]">
                      {settings.privateRag.folderPath ? (
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>{settings.privateRag.folderPath}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="w-5 h-5" />
                          <span>No folder selected</span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" onClick={handlePrivateRagFolder}>
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Choose Folder
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#141415] border-[#262626]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    Immutable Memory Backup
                  </CardTitle>
                  <CardDescription>
                    Choose a local folder to store encrypted memory backups
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-4 bg-[#0A0A0B] rounded-lg border border-[#262626]">
                      {settings.immutableMemory.backupFolderPath ? (
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>{settings.immutableMemory.backupFolderPath}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="w-5 h-5" />
                          <span>No folder selected</span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" onClick={handleImmutableMemoryFolder}>
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Choose Folder
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Memories are encrypted with your wallet key before storage
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Model Preferences */}
          <TabsContent value="models">
            <Card className="bg-[#141415] border-[#262626]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-500" />
                  Preferred Models
                </CardTitle>
                <CardDescription>
                  Choose your preferred AI model for each application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.modelPreferences.map((pref) => (
                  <div key={pref.appId} className="flex items-center justify-between p-4 bg-[#0A0A0B] rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{pref.appName}</div>
                      <div className="text-xs text-muted-foreground">ID: {pref.appId}</div>
                    </div>
                    <Select
                      value={pref.preferredModel}
                      onValueChange={(v) => updateModelPreference(pref.appId, v)}
                    >
                      <SelectTrigger className="w-[200px] bg-[#141415] border-[#262626]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141415] border-[#262626]">
                        <SelectItem value="gpt-4o">GPT-4o (Best)</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                        <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                        <SelectItem value="claude-3-haiku">Claude 3 Haiku (Fast)</SelectItem>
                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                        <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys */}
          <TabsContent value="api">
            <Card className="bg-[#141415] border-[#262626]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-red-500" />
                  Model API Keys
                </CardTitle>
                <CardDescription>
                  Manage your API keys for AI model providers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.values(LLM_PROVIDERS).map((provider) => (
                  <div key={provider.id} className="p-4 bg-[#0A0A0B] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provider.name}</span>
                        {apiKeys[provider.id] ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Configured
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Not configured
                          </Badge>
                        )}
                      </div>
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-white"
                      >
                        Get Key →
                      </a>
                    </div>
                    <Input
                      type="password"
                      placeholder={`Enter your ${provider.name} API key`}
                      value={apiKeys[provider.id] || ''}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                      className="bg-[#141415] border-[#262626]"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      ${provider.costPer1KTokens.input}/1K input tokens • ${provider.costPer1KTokens.output}/1K output tokens
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cost Limits */}
          <TabsContent value="costs">
            <Card className="bg-[#141415] border-[#262626]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                  Cost Limits
                </CardTitle>
                <CardDescription>
                  Set spending limits to control AI costs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Daily Limit</Label>
                    <span className="text-lg font-bold">${settings.costLimits.dailyLimit}</span>
                  </div>
                  <Slider
                    value={[settings.costLimits.dailyLimit]}
                    onValueChange={([v]) => updateCostLimits('dailyLimit', v)}
                    max={500}
                    min={0}
                    step={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum spending per day across all AI services
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Monthly Limit</Label>
                    <span className="text-lg font-bold">${settings.costLimits.monthlyLimit}</span>
                  </div>
                  <Slider
                    value={[settings.costLimits.monthlyLimit]}
                    onValueChange={([v]) => updateCostLimits('monthlyLimit', v)}
                    max={5000}
                    min={0}
                    step={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum spending per month across all AI services
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Alert Threshold</Label>
                    <span className="text-lg font-bold">{settings.costLimits.alertThreshold}%</span>
                  </div>
                  <Slider
                    value={[settings.costLimits.alertThreshold]}
                    onValueChange={([v]) => updateCostLimits('alertThreshold', v)}
                    max={100}
                    min={50}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when spending reaches this percentage of limits
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
