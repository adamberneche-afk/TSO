import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useInterviewStore } from '../../../hooks/useInterview';
import { useLLMSettings } from '../../../hooks/useLLMSettings';
import { LLMClient } from '../../../services/llmClient';
import { getDecryptedApiKey } from '../../../services/apiKeyManager';
import { extractEntities } from '../../../services/entityExtraction';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { BrowserProvider } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ConversationalGoalsStepProps {
  onComplete: () => void;
}

const SYSTEM_PROMPT = `You are an AI assistant helping users design their perfect AI agent. Your role is to have a natural conversation to understand:

1. What goals they want the agent to help with (work, learning, creative, organization, entertainment, or custom)
2. What skills or capabilities they want the agent to have
3. Their preferred communication style (formal/casual, brief/detailed)
4. Any specific technologies or tools they want integrated

Be conversational and ask one question at a time. After 3-4 exchanges, summarize what you've learned and confirm with the user.

Keep responses concise (2-3 sentences max). Be friendly but professional.

When you have enough information, end your response with "Shall I proceed with this configuration?" to signal completion.`;

const INITIAL_MESSAGE = `Hi! I'm here to help you design your perfect AI agent. 

To get started, what's the main thing you'd like your agent to help you with? For example: productivity, learning, creative projects, organization, or something else?`;

export function ConversationalGoalsStep({ onComplete }: ConversationalGoalsStepProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: INITIAL_MESSAGE, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmClient, setLlmClient] = useState<LLMClient | null>(null);
  const [extractedData, setExtractedData] = useState<{
    goals: string[];
    skills: string[];
    technologies: string[];
    personality: { tone: number; verbosity: number; formality: number };
  }>({
    goals: [],
    skills: [],
    technologies: [],
    personality: { tone: 50, verbosity: 50, formality: 50 }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { updateAnswers } = useInterviewStore();
  const { selectedProvider, customBaseUrl } = useLLMSettings();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const initLLM = async () => {
      if (!selectedProvider) return;

      if (selectedProvider === 'local') {
        setLlmClient(new LLMClient('local', '', customBaseUrl));
        return;
      }

      try {
        if (!window.ethereum) return;
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const apiKey = await getDecryptedApiKey(selectedProvider, signer);
        if (apiKey) {
          setLlmClient(new LLMClient(selectedProvider, apiKey, customBaseUrl));
        }
      } catch (error) {
        console.error('Failed to initialize LLM:', error);
      }
    };

    initLLM();
  }, [selectedProvider, customBaseUrl]);

  const analyzeConversation = useCallback((userMessage: string, assistantResponse: string) => {
    const entities = extractEntities(userMessage + ' ' + assistantResponse);
    
    const goalKeywords = ['work', 'learning', 'creative', 'organization', 'entertainment', 'productivity', 'education', 'business', 'personal'];
    const skillKeywords = ['writing', 'coding', 'analysis', 'research', 'summarization', 'translation', 'scheduling', 'email', 'calendar'];
    const techKeywords = ['api', 'database', 'webhook', 'slack', 'notion', 'github', 'jira', 'google', 'microsoft'];
    
    const lowerMessage = userMessage.toLowerCase();
    const lowerResponse = assistantResponse.toLowerCase();
    const combined = lowerMessage + ' ' + lowerResponse;

    const newGoals = goalKeywords.filter(g => combined.includes(g) && !extractedData.goals.includes(g));
    const newSkills = entities.filter(e => e.type === 'skill' || e.type === 'technology').map(e => e.value);
    const newTech = techKeywords.filter(t => combined.includes(t) && !extractedData.technologies.includes(t));

    const toneMatch = combined.match(/(formal|professional|serious)/) ? 70 : combined.match(/(casual|friendly|relaxed)/) ? 30 : 50;
    const verbosityMatch = combined.match(/(brief|concise|short)/) ? 30 : combined.match(/(detailed|thorough|comprehensive)/) ? 70 : 50;

    setExtractedData(prev => ({
      goals: [...new Set([...prev.goals, ...newGoals])],
      skills: [...new Set([...prev.skills, ...newSkills])],
      technologies: [...new Set([...prev.technologies, ...newTech])],
      personality: {
        tone: toneMatch,
        verbosity: verbosityMatch,
        formality: toneMatch
      }
    }));
  }, [extractedData]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      let response: string;
      let usedLLM = false;

      if (llmClient) {
        try {
          const conversationHistory = messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }));
          
          const llmResponse = await llmClient.complete({
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...conversationHistory.slice(-6),
              { role: 'user', content: userMessage }
            ]
          });
          
          response = llmResponse.content;
          usedLLM = true;
        } catch (llmError) {
          console.warn('LLM call failed, falling back to pattern matching:', llmError);
        }
      }
      
      if (!usedLLM) {
        const entities = extractEntities(userMessage);
        const lowerInput = userMessage.toLowerCase();
        
        if (lowerInput.includes('work') || lowerInput.includes('business') || lowerInput.includes('professional')) {
          response = `Great! A work-focused agent. What specific tasks would you like help with? For example: email management, scheduling, document creation, or research?`;
        } else if (lowerInput.includes('learn') || lowerInput.includes('education') || lowerInput.includes('study')) {
          response = `Excellent choice! A learning assistant. What subjects or skills are you looking to develop?`;
        } else if (lowerInput.includes('creative') || lowerInput.includes('write') || lowerInput.includes('art')) {
          response = `Creative projects are exciting! What kind of creative work - writing, design, music, or something else?`;
        } else if (lowerInput.includes('organize') || lowerInput.includes('productivity') || lowerInput.includes('schedule')) {
          response = `Organization is key! What areas of your life need the most help - calendar, tasks, projects, or everything?`;
        } else if (entities && entities.length > 0) {
          response = `I see you're interested in ${entities.map(e => e.value).join(' and ')}. Tell me more about how you'd like your agent to help with that.`;
        } else if (messages.length > 6) {
          response = `Based on our conversation, I think I have a good understanding of what you need. Shall I proceed with this configuration?`;
        } else {
          response = `Interesting! Can you tell me more about how you envision using this agent in your daily life?`;
        }
      }

      analyzeConversation(userMessage, response);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, assistantMsg]);

      if (response.toLowerCase().includes('shall i proceed') || messages.length >= 8) {
        updateAnswers({
          goals: extractedData.goals.length > 0 ? extractedData.goals : ['general'],
          description: messages.filter(m => m.role === 'user').map(m => m.content).join(' '),
          personality: extractedData.personality
        });
        
        setTimeout(() => {
          toast.success('Goals captured!', { description: 'Moving to skill selection...' });
          onComplete();
        }, 1500);
      }
    } catch (error) {
      console.error('Conversation error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 100)}px`;
    }
  }, [input]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4 py-4">
        <h1 className="text-4xl font-bold text-white">Build Your AI Agent</h1>
        <p className="text-lg text-[#A1A1A1] max-w-2xl mx-auto">
          Let's have a conversation to design your perfect agent. I'll ask a few questions to understand your needs.
        </p>
      </div>

      <div className="bg-[#141415] border border-[#262626] rounded-lg overflow-hidden">
        <div className="h-[400px] overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#1a1a1a] border border-[#262626] text-[#EDEDED]'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-[#3B82F6]" />
                    <span className="text-xs text-[#717171] uppercase tracking-widest">Agent Designer</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-[#262626] p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              disabled={isLoading}
              className="flex-1 bg-[#0A0A0B] border border-[#262626] rounded-md px-4 py-3 text-sm text-[#EDEDED] placeholder:text-[#717171] focus:border-[#3B82F6] outline-none resize-none min-h-[44px] max-h-[100px]"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-white text-black px-4 py-2 rounded-md font-bold text-xs uppercase tracking-widest hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-[#717171] mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {extractedData.goals.length > 0 && (
        <div className="bg-[#141415] border border-[#262626] rounded-lg p-4">
          <h3 className="text-xs uppercase tracking-widest text-[#717171] mb-2">Detected Goals & Skills</h3>
          <div className="flex flex-wrap gap-2">
            {extractedData.goals.map(g => (
              <span key={g} className="text-xs bg-[#3B82F6]/20 border border-[#3B82F6]/30 text-[#93C5FD] px-2 py-1 rounded">
                {g}
              </span>
            ))}
            {extractedData.skills.map(s => (
              <span key={s} className="text-xs bg-[#4ADE80]/20 border border-[#4ADE80]/30 text-[#4ADE80] px-2 py-1 rounded">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {!selectedProvider && (
        <div className="bg-[#FEF3C7]/10 border border-[#FEF3C7]/20 rounded-lg p-4 text-center">
          <p className="text-sm text-[#FEF3C7]">
            Configure an LLM provider in settings for AI-powered conversations, or continue with basic mode.
          </p>
        </div>
      )}

      {selectedProvider === 'local' && typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && (
        <div className="bg-[#FEF3C7]/10 border border-[#FEF3C7]/20 rounded-lg p-4 text-center">
          <p className="text-sm text-[#FEF3C7]">
            Local Ollama cannot be accessed from deployed apps. Configure a cloud provider (OpenAI, Anthropic) for AI-powered conversations, or continue with basic mode.
          </p>
        </div>
      )}
    </div>
  );
}
