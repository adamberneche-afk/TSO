"use client";

import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Edit3, Eye, Copy, Check } from "lucide-react";

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  language?: string;
  theme?: "vs-dark" | "light";
}

export function MonacoEditor({
  value,
  onChange,
  height = "400px",
  readOnly = true,
  language = "json",
  theme = "vs-dark",
}: MonacoEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editorValue, setEditorValue] = useState(value);

  // Handle editor content change
  const handleEditorChange = useCallback(
    (newValue: string | undefined) => {
      const updatedValue = newValue || "";
      setEditorValue(updatedValue);
      onChange?.(updatedValue);
    },
    [onChange]
  );

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editorValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Format JSON
  const formatJSON = () => {
    try {
      const parsed = JSON.parse(editorValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setEditorValue(formatted);
      onChange?.(formatted);
    } catch (err) {
      // Invalid JSON, don't format
      console.error("Invalid JSON:", err);
    }
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleEditMode}
            className="text-xs"
          >
            {isEditing ? (
              <>
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                View Mode
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                Edit JSON
              </>
            )}
          </Button>

          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={formatJSON}
              className="text-xs"
            >
              Format
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Editor */}
      <div className="rounded-lg overflow-hidden border border-[var(--border-default)]">
        <Editor
          height={height}
          language={language}
          value={editorValue}
          theme={theme}
          options={{
            readOnly: readOnly && !isEditing,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            fontFamily: "'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            wordWrap: "on",
            wrappingIndent: "indent",
            renderLineHighlight: "all",
            selectOnLineNumbers: true,
            matchBrackets: "always",
            folding: true,
            foldingHighlight: true,
            showFoldingControls: "always",
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
          }}
          onChange={handleEditorChange}
          loading={
            <div className="flex items-center justify-center h-[400px] bg-[#1e1e1e] text-[var(--text-muted)]">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-primary)]" />
            </div>
          }
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between mt-2 px-1 text-xs text-[var(--text-muted)]">
        <span>
          {isEditing ? (
            <span className="text-yellow-500">● Editing Mode</span>
          ) : (
            <span className="text-green-500">● Read-Only</span>
          )}
        </span>
        <span>{language.toUpperCase()}</span>
      </div>
    </div>
  );
}

export default MonacoEditor;
