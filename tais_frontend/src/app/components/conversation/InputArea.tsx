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
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        {/* Voice Input Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`shrink-0 ${isRecording ? 'bg-red-100 text-red-600 hover:bg-red-200' : ''}`}
          onClick={toggleRecording}
          disabled={disabled || isProcessing}
          title={isRecording ? 'Stop recording' : 'Start voice input'}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Conversation complete' : placeholder}
            disabled={disabled || isProcessing}
            className="min-h-[44px] max-h-[150px] resize-none pr-12 py-3"
            rows={1}
          />
          <div className="absolute right-3 bottom-3 text-xs text-gray-400">
            {input.length > 0 && `${input.length} chars`}
          </div>
        </div>

        {/* Send Button */}
        <Button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isProcessing || disabled}
          className="shrink-0 bg-blue-500 hover:bg-blue-600 text-white"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Help Text */}
      <div className="text-center mt-2 text-xs text-gray-400">
        Press Enter to send, Shift + Enter for new line
      </div>
    </div>
  );
};
