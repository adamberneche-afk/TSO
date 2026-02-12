// TAIS Platform - Configuration Preview Component

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { AgentConfig } from '../../../types/agent';
import { Button } from '../ui/button';
import { Download, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigPreviewProps {
  config: AgentConfig;
  onUpdate?: (config: AgentConfig) => void;
  editable?: boolean;
}

export function ConfigPreview({ config, onUpdate, editable = false }: ConfigPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const configJSON = JSON.stringify(config, null, 2);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Agent Configuration</h3>
        <div className="flex gap-2">
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

      <div className="border border-[#333333] rounded-lg overflow-hidden">
        <Editor
          height="500px"
          defaultLanguage="json"
          value={configJSON}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            readOnly: !isEditing,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'JetBrains Mono, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>

      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-2">Configuration Summary</h4>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[#888888]">Agent Name</dt>
            <dd className="text-white font-medium">{config.agent.name}</dd>
          </div>
          <div>
            <dt className="text-[#888888]">Version</dt>
            <dd className="text-white font-medium">{config.agent.version}</dd>
          </div>
          <div>
            <dt className="text-[#888888]">Goals</dt>
            <dd className="text-white font-medium">{config.agent.goals.length} selected</dd>
          </div>
          <div>
            <dt className="text-[#888888]">Skills</dt>
            <dd className="text-white font-medium">{config.agent.skills.length} installed</dd>
          </div>
          <div>
            <dt className="text-[#888888]">Autonomy</dt>
            <dd className="text-white font-medium capitalize">{config.agent.autonomy.level}</dd>
          </div>
          <div>
            <dt className="text-[#888888]">Privacy</dt>
            <dd className="text-white font-medium capitalize">{config.agent.constraints.privacy}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
