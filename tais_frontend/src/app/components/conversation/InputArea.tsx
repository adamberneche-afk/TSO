import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';

interface InputAreaProps {
  onSend: (message: string) => void;
  isProcessing: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSend,
  isProcessing,
  placeholder = 'Type your message...',
  disabled = false
}) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !isProcessing && !disabled) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Voice recording would be implemented here
    // For now, just toggle the UI state
  };

  return (
    <div className="border-t border-[#262626] bg-[#0A0A0B] p-4">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`shrink-0 border-[#262626] hover:bg-white/5 ${isRecording ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20' : 'text-[#A1A1A1]'}`}
          onClick={toggleRecording}
          disabled={disabled || isProcessing}
          title={isRecording ? 'Stop recording' : 'Start voice input'}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Conversation complete' : placeholder}
            disabled={disabled || isProcessing}
            className="min-h-[44px] max-h-[150px] resize-none pr-12 py-3 bg-[#0A0A0B] border-[#262626] text-[#EDEDED] placeholder:text-[#717171] focus:border-[#3B82F6] rounded-md"
            rows={1}
          />
          <div className="absolute right-3 bottom-3 text-xs text-[#717171]">
            {input.length > 0 && `${input.length} chars`}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isProcessing || disabled}
          className="shrink-0 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-white/90 disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="text-center mt-2 text-xs text-[#717171]">
        Press Enter to send, Shift + Enter for new line
      </div>
    </div>
  );
};
