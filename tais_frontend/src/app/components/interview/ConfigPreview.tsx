// TAIS Platform - Configuration Preview Component

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { AgentConfig } from '../../../types/agent';
import { Button } from '../ui/button';
import { Download, Copy, Check, Save, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { configApi } from '../../../services/configApi';
import { generateConfigSummary, generateBulletSummary } from '../../../lib/config-summary';

interface ConfigPreviewProps {
  config: AgentConfig;
  onUpdate?: (config: AgentConfig) => void;
  editable?: boolean;
  onSaveSuccess?: () => void;
}

export function ConfigPreview({ config, onUpdate, editable = false, onSaveSuccess }: ConfigPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    allowed: boolean;
    currentCount: number;
    limit: number;
    remaining: number;
    isHolder: boolean;
  } | null>(null);
  const configJSON = JSON.stringify(config, null, 2);
  const naturalSummary = generateConfigSummary(config);
  const bulletSummary = generateBulletSummary(config);

  useEffect(() => {
    checkSaveEligibility();
  }, []);

  const checkSaveEligibility = async () => {
    try {
      const status = await configApi.getStatus();
      setSaveStatus({
        allowed: status.allowed,
        currentCount: status.currentCount,
        limit: status.limit,
        remaining: status.remaining,
        isHolder: status.tokenCount > 0
      });
      setCanSave(status.allowed);
    } catch (error) {
      console.error('Failed to check save eligibility:', error);
      setCanSave(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([configJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.agent.name}-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Configuration downloaded');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(configJSON);
      setCopied(true);
      toast.success('Configuration copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy configuration');
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!value || !onUpdate) return;

    try {
      const updatedConfig = JSON.parse(value);
      onUpdate(updatedConfig);
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  };

  const handleSave = async () => {
    if (!canSave) {
      if (!saveStatus?.isHolder) {
        toast.error('NFT Required', {
          description: 'Only THINK Agent Bundle holders can save configurations.',
        });
      } else {
        toast.error('Limit Reached', {
          description: `You've reached your limit of ${saveStatus?.limit} configurations.`,
        });
      }
      return;
    }

    setIsSaving(true);
    try {
      const result = await configApi.saveConfiguration(
        config.agent.name,
        config,
        `Configuration for ${config.agent.name} created via Interview Wizard`
      );

      toast.success('Configuration Saved!', {
        description: `You have ${result.remaining} of ${result.limit} saves remaining.`,
      });

      // Refresh status
      await checkSaveEligibility();

      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      toast.error('Failed to Save', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Agent Configuration</h3>
        <div className="flex gap-2">
          {canSave && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              variant="outline"
              size="sm"
              className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white"
              title={saveStatus ? `${saveStatus.remaining} of ${saveStatus.limit} saves remaining` : 'Save to cloud'}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="ml-2">
                {isSaving ? 'Saving...' : `Save (${saveStatus?.remaining ?? '?'}/${saveStatus?.limit ?? '?'})`}
              </span>
            </Button>
          )}
          {editable && (
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              size="sm"
              className="border-[#333333] text-[#888888] hover:text-white"
            >
              {isEditing ? 'View Only' : 'Edit JSON'}
            </Button>
          )}
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="border-[#333333] text-[#888888] hover:text-white"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="border-[#333333] text-[#888888] hover:text-white"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Side-by-Side Layout: JSON + Natural Language */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: JSON Editor */}
        <div className="border border-[#333333] rounded-lg overflow-hidden flex flex-col">
          <div className="bg-[#252525] px-4 py-2 border-b border-[#333333] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
              <span className="text-xs text-[#888888] uppercase tracking-wider">JSON Configuration</span>
            </div>
            <span className="text-xs text-[#666666]">Technical View</span>
          </div>
          <div className="flex-1">
            <Editor
              height="500px"
              defaultLanguage="json"
              value={configJSON}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                readOnly: !isEditing,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>
          <div className="bg-[#1a1a1a] px-4 py-2 border-t border-[#333333]">
            <p className="text-xs text-[#666666]">
              💡 Tip: Compare this JSON with the natural language description on the right to learn the structure.
            </p>
          </div>
        </div>

        {/* Right: Natural Language Summary */}
        <div className="border border-[#333333] rounded-lg overflow-hidden flex flex-col bg-[#1a1a1a]">
          <div className="bg-[#252525] px-4 py-2 border-b border-[#333333] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-xs text-[#888888] uppercase tracking-wider">Natural Language</span>
            </div>
            <span className="text-xs text-[#666666]">Human-Readable View</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Natural Language Description */}
            <div className="p-4 bg-[#252525] rounded-lg border-l-4 border-[#3B82F6]">
              <h5 className="text-xs text-[#3B82F6] uppercase tracking-wider mb-2">Overview</h5>
              <p className="text-sm text-[#e0e0e0] leading-relaxed whitespace-pre-line">
                {naturalSummary}
              </p>
            </div>
            
            {/* Quick Stats Grid */}
            <div>
              <h5 className="text-xs text-[#888888] uppercase tracking-wider mb-2">Quick Stats</h5>
              <div className="grid grid-cols-2 gap-2">
                {bulletSummary.slice(0, 4).map((item, index) => (
                  <div key={index} className="bg-[#252525] rounded p-3 border border-[#333333]">
                    <dt className="text-xs text-[#888888] mb-1">{item.label}</dt>
                    <dd className="text-sm text-white font-medium truncate">{item.value}</dd>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Detailed Breakdown */}
            <div className="bg-[#252525] rounded-lg border border-[#333333]">
              <h5 className="text-xs text-[#888888] uppercase tracking-wider px-3 py-2 border-b border-[#333333]">
                Detailed Breakdown
              </h5>
              <dl className="divide-y divide-[#333333]">
                {bulletSummary.map((item, index) => (
                  <div key={index} className="flex justify-between px-3 py-2 text-sm">
                    <dt className="text-[#888888]">{item.label}</dt>
                    <dd className="text-white font-medium text-right">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          
          <div className="bg-[#1a1a1a] px-4 py-2 border-t border-[#333333]">
            <p className="text-xs text-[#666666]">
              📝 This description is generated from the JSON configuration on the left.
            </p>
          </div>
        </div>
      </div>

      {/* Genesis Holder Info */}
      {saveStatus?.isHolder ? (
        <div className="bg-[#1a1a3a] border border-[#3B82F6]/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#3B82F6]/20 rounded-lg">
              <Save className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-white mb-1">Genesis Holder Benefit</h4>
              <p className="text-sm text-[#888888]">
                You can save up to {saveStatus.limit} configurations ({saveStatus.limit / 2} NFTs × 2).
                {' '}
                {saveStatus.remaining > 0 ? (
                  <span className="text-[#10B981]">{saveStatus.remaining} saves remaining.</span>
                ) : (
                  <span className="text-[#EF4444]">Limit reached. Delete old configs to save new ones.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#F59E0B]/20 rounded-lg">
              <Save className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-white mb-1">Want to Save Configurations?</h4>
              <p className="text-sm text-[#888888]">
                Hold a THINK Agent Bundle NFT to save up to 2 configurations per token.
                {' '}
                <a
                  href="https://opensea.io/collection/think-agent-bundle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3B82F6] hover:underline"
                >
                  View Collection on OpenSea
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
