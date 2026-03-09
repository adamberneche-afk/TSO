// KB Context Management Panel
// Manage knowledge base context types and RCRT exclusions

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Lock, 
  Users, 
  Globe, 
  Shield, 
  ChevronDown,
  RefreshCw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { kbApi, KBRegistry } from '../../../services/rcrtApi';

interface KBContextPanelProps {
  walletAddress: string;
}

const contextTypeConfig = {
  private: {
    label: 'Private',
    icon: Lock,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950',
    description: 'Only visible to the source app'
  },
  confidential: {
    label: 'Confidential',
    icon: Shield,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    description: 'Visible to apps with explicit grants'
  },
  shared: {
    label: 'Shared',
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    description: 'Visible to pathway apps'
  },
  public: {
    label: 'Public',
    icon: Globe,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950',
    description: 'Visible to all connected apps'
  }
};

export function KBContextPanel({ walletAddress }: KBContextPanelProps) {
  const [registries, setRegistries] = useState<KBRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadRegistries();
  }, [walletAddress]);

  const loadRegistries = async () => {
    try {
      setLoading(true);
      const { kbRegistries } = await kbApi.getRegistries();
      setRegistries(kbRegistries || []);
    } catch (error) {
      console.error('Failed to load KB registries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContextTypeChange = async (kbId: string, contextType: string) => {
    try {
      setSaving(kbId);
      await kbApi.updateContextType(kbId, contextType);
      await loadRegistries();
      toast.success('Context type updated');
    } catch (error) {
      toast.error('Failed to update context type');
    } finally {
      setSaving(null);
    }
  };

  const handleExcludeToggle = async (kb: KBRegistry) => {
    try {
      setSaving(kb.kbId);
      await kbApi.setExcludeFromRCRT(kb.kbId, !kb.excludedFromRCRT);
      await loadRegistries();
      toast.success(kb.excludedFromRCRT ? 'RCRT exclusion removed' : 'Excluded from RCRT');
    } catch (error) {
      toast.error('Failed to update RCRT exclusion');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Knowledge Base Context
        </h3>
        <Button variant="outline" size="sm" onClick={loadRegistries}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {registries.length === 0 ? (
        <div className="text-center py-8 p-6 border-2 border-dashed rounded-lg">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No knowledge bases registered</p>
          <p className="text-sm text-muted-foreground mt-1">
            Register a KB to control its context type and RCRT access
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {registries.map((kb) => {
            const config = contextTypeConfig[kb.contextType as keyof typeof contextTypeConfig];
            const Icon = config?.icon || Globe;

            return (
              <div 
                key={kb.id} 
                className={`p-4 rounded-lg border ${config?.bgColor || 'bg-muted'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm truncate">
                        {kb.kbId}
                      </span>
                      {kb.excludedFromRCRT && (
                        <Badge variant="secondary" className="text-xs">
                          Excluded from RCRT
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className={`h-4 w-4 ${config?.color}`} />
                      <span>{config?.label || kb.contextType}</span>
                      <span className="text-xs">•</span>
                      <span className="text-xs">{config?.description}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={kb.contextType}
                      onChange={(e) => handleContextTypeChange(kb.kbId, e.target.value)}
                      disabled={saving === kb.kbId}
                      className="text-sm border rounded px-2 py-1 bg-background"
                    >
                      <option value="private">Private</option>
                      <option value="confidential">Confidential</option>
                      <option value="shared">Shared</option>
                      <option value="public">Public</option>
                    </select>

                    <Button
                      variant={kb.excludedFromRCRT ? "outline" : "ghost"}
                      size="sm"
                      onClick={() => handleExcludeToggle(kb)}
                      disabled={saving === kb.kbId}
                      title={kb.excludedFromRCRT ? "Include in RCRT" : "Exclude from RCRT"}
                    >
                      {kb.excludedFromRCRT ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Badge({ variant = "secondary", className = "", children }: any) {
  const variantClasses = {
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    outline: "border border-input"
  };
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant as keyof typeof variantClasses] || variantClasses.secondary} ${className}`}>
      {children}
    </span>
  );
}

function Button({ variant = "default", size = "default", className = "", children, ...props }: any) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent",
    ghost: "hover:bg-accent",
    link: "text-primary underline-offset-4 hover:underline"
  };
  
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10"
  };
  
  return (
    <button 
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium ${variantClasses[variant as keyof typeof variantClasses] || variantClasses.default} ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.default} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
