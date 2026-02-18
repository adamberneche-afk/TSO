import React, { useEffect, useState, useCallback } from 'react';
import { ConversationContainer } from './ConversationContainer';
import { LLMSettingsPanel, CostDisplay } from '../llm';
import { useLLMSettings } from '../../../hooks/useLLMSettings';
import { useCostTracker } from '../../../hooks/useCostTracker';
import { LLMClient, generateDynamicQuestion } from '../../../services/llmClient';
import { getDecryptedApiKey } from '../../../services/apiKeyManager';
import { useConversationStore } from '../../../hooks/useConversation';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Settings, MessageSquare, ArrowRight } from 'lucide-react';
import { BrowserProvider } from 'ethers';
import { toast } from 'sonner';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface DynamicConversationContainerProps {
  onClose?: () => void;
}

export const DynamicConversationContainer: React.FC<DynamicConversationContainerProps> = ({
  onClose
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [llmClient, setLlmClient] = useState<LLMClient | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const { selectedProvider, customBaseUrl, costSettings } = useLLMSettings();
  const { startTracking, canMakeRequest } = useCostTracker();
  const { messages, currentQuestionIndex, addMessage, advanceQuestion } = useConversationStore();

  // Initialize LLM client when provider changes
  useEffect(() => {
    const initClient = async () => {
      if (!selectedProvider) {
        setLlmClient(null);
        return;
      }

      // Local models don't need API keys
      if (selectedProvider === 'local') {
        setLlmClient(new LLMClient('local', '', customBaseUrl));
        startTracking(costSettings);
        return;
      }

      // For other providers, need to decrypt API key
      try {
        if (!window.ethereum) {
          toast.error('Please install MetaMask');
          return;
        }
        
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const apiKey = await getDecryptedApiKey(selectedProvider, signer);
        
        if (apiKey) {
          setLlmClient(new LLMClient(selectedProvider, apiKey, customBaseUrl));
          startTracking(costSettings);
        } else {
          setLlmClient(null);
          toast.error(`Please save your ${selectedProvider} API key`);
        }
      } catch (error) {
        console.error('Failed to initialize LLM client:', error);
        setLlmClient(null);
      }
    };

    initClient();
  }, [selectedProvider, customBaseUrl, costSettings, startTracking]);

  // Generate dynamic question using LLM
  const generateNextQuestion = useCallback(async () => {
    if (!llmClient || !canMakeRequest()) return;

    setIsInitializing(true);
    try {
      // Get previous user responses
      const userResponses = messages
        .filter(m => m.role === 'user')
        .map(m => m.content);

      // Generate dynamic question based on context
      const question = await generateDynamicQuestion(
        llmClient,
        userResponses,
        currentQuestionIndex
      );

      // Add as assistant message
      addMessage(question, 'assistant');
      advanceQuestion();
    } catch (error) {
      console.error('Failed to generate question:', error);
      toast.error('Failed to generate question. Falling back to static questions.');
      // Fall back to advancing with static question
      advanceQuestion();
    } finally {
      setIsInitializing(false);
    }
  }, [llmClient, messages, currentQuestionIndex, addMessage, advanceQuestion, canMakeRequest]);

  // Override the default question advancement to use LLM
  useEffect(() => {
    // This is a placeholder - you'd need to integrate with your actual conversation logic
    // The idea is to intercept question advancement and use LLM when available
  }, [llmClient]);

  if (showSettings) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">AI Provider Settings</h2>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Back to Interview
            </Button>
          </div>
          <LLMSettingsPanel onComplete={() => setShowSettings(false)} />
        </div>
      </div>
    );
  }

  // Show setup prompt if no provider selected
  if (!selectedProvider) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
              <Settings className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold">Configure AI Provider</h3>
            <p className="text-gray-600">
              To enable dynamic question generation, please configure your AI provider and API key.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => setShowSettings(true)} 
                className="w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Provider
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Use Static Mode
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with cost display */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold">AI-Powered Interview</h2>
            {llmClient && (
              <span className="text-sm text-gray-500">
                Using: {selectedProvider === 'local' ? 'Local (Ollama)' : selectedProvider}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-64">
              <CostDisplay compact />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Main conversation area */}
      <div className="flex-1">
        <ConversationContainer 
          onClose={onClose}
          showSidebar={true}
        />
      </div>

      {/* Dynamic question generation indicator */}
      {isInitializing && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-2 px-4 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-blue-700">Generating next question...</span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DynamicConversationContainer;
