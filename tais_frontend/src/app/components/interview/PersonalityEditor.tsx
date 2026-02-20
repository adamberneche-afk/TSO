import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { validatePersonalityMarkdown, TIER_LIMITS, estimateTokenCount } from '../../../services/personalityValidator';
import { markdownToHtml } from '../../../services/personalityCompiler';
import { AlertCircle, Check, Sparkles, FileText } from 'lucide-react';

interface PersonalityEditorProps {
  value: string;
  onChange: (value: string) => void;
  tier?: 'free' | 'bronze' | 'silver' | 'gold';
  agentName?: string;
  onGenerateWithAI?: () => void;
  isGenerating?: boolean;
  readOnly?: boolean;
}

export function PersonalityEditor({
  value,
  onChange,
  tier = 'bronze',
  agentName = 'Agent',
  onGenerateWithAI,
  isGenerating = false,
  readOnly = false,
}: PersonalityEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [validation, setValidation] = useState(validatePersonalityMarkdown(value || '', tier));
  const [previewHtml, setPreviewHtml] = useState('');

  const limits = TIER_LIMITS[tier];
  const tokenCount = estimateTokenCount(value || '');

  useEffect(() => {
    const result = validatePersonalityMarkdown(value || '', tier);
    setValidation(result);
    
    if (activeTab === 'preview' && value) {
      setPreviewHtml(markdownToHtml(value));
    }
  }, [value, tier, activeTab]);

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    onChange(newValue || '');
  }, [onChange]);

  const sizePercentage = Math.min((validation.sizeBytes / limits.maxSizeBytes) * 100, 100);
  const sizeColor = sizePercentage > 90 ? 'bg-red-500' : sizePercentage > 70 ? 'bg-yellow-500' : 'bg-[#3B82F6]';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'edit'
                ? 'bg-[#3B82F6] text-white'
                : 'bg-[#1a1a1a] text-[#A1A1A1] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Edit
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'preview'
                ? 'bg-[#3B82F6] text-white'
                : 'bg-[#1a1a1a] text-[#A1A1A1] hover:text-white'
            }`}
          >
            Preview
          </button>
        </div>

        {onGenerateWithAI && (
          <button
            onClick={onGenerateWithAI}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md font-bold text-xs uppercase tracking-widest hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate with AI'}
          </button>
        )}
      </div>

      <div className="bg-[#141415] border border-[#262626] rounded-lg overflow-hidden">
        {activeTab === 'edit' ? (
          <div className="h-[400px]">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={value}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                readOnly,
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>
        ) : (
          <div 
            className="h-[400px] overflow-y-auto p-6 prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-[#717171]">No content to preview</p>' }}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {validation.valid ? (
              <Check className="w-4 h-4 text-[#4ADE80]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span className={validation.valid ? 'text-[#4ADE80]' : 'text-red-500'}>
              {validation.valid ? 'Valid' : `${validation.errors.length} error(s)`}
            </span>
          </div>

          <span className="text-[#717171]">
            ~{tokenCount} tokens
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#717171]">
            {(validation.sizeBytes / 1024).toFixed(1)}KB / {limits.maxSizeBytes / 1024}KB
          </span>
          <div className="w-24 h-2 bg-[#262626] rounded-full overflow-hidden">
            <div 
              className={`h-full ${sizeColor} transition-all`}
              style={{ width: `${sizePercentage}%` }}
            />
          </div>
        </div>
      </div>

      {validation.errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <ul className="space-y-1">
            {validation.errors.map((error, i) => (
              <li key={i} className="text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <ul className="space-y-1">
            {validation.warnings.map((warning, i) => (
              <li key={i} className="text-sm text-yellow-400">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
