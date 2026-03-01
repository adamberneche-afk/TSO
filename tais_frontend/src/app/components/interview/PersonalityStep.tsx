import React, { useState, useCallback } from 'react';
import { useInterviewStore } from '../../../hooks/useInterview';
import { useLLMSettings } from '../../../hooks/useLLMSettings';
import { PersonalityEditor } from './PersonalityEditor';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { generateDefaultPersonality, compilePersonality } from '../../../services/personalityCompiler';
import { LLMClient } from '../../../services/llmClient';
import { getDecryptedApiKey } from '../../../services/apiKeyManager';
import { toast } from 'sonner';
import { providers } from 'ethers';
import { Sparkles, FileText, Sliders } from 'lucide-react';

declare global {
  interface Window {
    ethereum?: any;
  }
}

type EditorMode = 'sliders' | 'markdown';

export function PersonalityStep() {
  const { answers, updateAnswers } = useInterviewStore();
  const { selectedProvider, customBaseUrl } = useLLMSettings();
  
  const [mode, setMode] = useState<EditorMode>('sliders');
  const [isGenerating, setIsGenerating] = useState(false);
  const [personalityMd, setPersonalityMd] = useState(answers.personalityMd || '');

  const personality = answers.personality || { tone: 50, verbosity: 50, formality: 50 };

  const getToneLabel = (value: number) => {
    if (value < 33) return 'Direct';
    if (value < 66) return 'Balanced';
    return 'Conversational';
  };

  const getVerbosityLabel = (value: number) => {
    if (value < 33) return 'Brief';
    if (value < 66) return 'Balanced';
    return 'Detailed';
  };

  const getFormalityLabel = (value: number) => {
    if (value < 33) return 'Casual';
    if (value < 66) return 'Balanced';
    return 'Professional';
  };

  const handleSliderChange = (key: string, value: number) => {
    updateAnswers({
      personality: {
        ...personality,
        [key]: value,
      },
    });
  };

  const handleMarkdownChange = useCallback((value: string) => {
    setPersonalityMd(value);
    updateAnswers({
      personalityMd: value,
      usePersonalityMd: true,
    });
  }, [updateAnswers]);

  const handleModeChange = (newMode: EditorMode) => {
    if (newMode === 'markdown' && !answers.personalityMd) {
      const tone = personality.tone < 33 ? 'direct' : personality.tone < 66 ? 'balanced' : 'conversational';
      const verbosity = personality.verbosity < 33 ? 'brief' : personality.verbosity < 66 ? 'balanced' : 'detailed';
      const formality = personality.formality < 33 ? 'casual' : personality.formality < 66 ? 'balanced' : 'professional';
      
      const defaultMd = generateDefaultPersonality(
        answers.name || 'Agent',
        { tone, verbosity, formality } as any,
        answers.goals || []
      );
      setPersonalityMd(defaultMd);
      updateAnswers({
        personalityMd: defaultMd,
        usePersonalityMd: true,
      });
    } else if (newMode === 'sliders') {
      updateAnswers({
        usePersonalityMd: false,
      });
    }
    setMode(newMode);
  };

  const handleGenerateWithAI = async () => {
    if (!selectedProvider) {
      toast.error('Please configure an LLM provider in settings');
      return;
    }

    setIsGenerating(true);
    
    try {
      let llmClient: LLMClient;
      
      if (selectedProvider === 'local') {
        llmClient = new LLMClient('local', '', customBaseUrl);
      } else {
        if (!window.ethereum) {
          toast.error('Please connect your wallet');
          return;
        }
        
        const provider = new providers.Web3Provider(window.ethereum);
        const signer = await provider.getSigner();
        const apiKey = await getDecryptedApiKey(selectedProvider, signer);
        
        if (!apiKey) {
          toast.error('Please configure your API key in settings');
          return;
        }
        
        llmClient = new LLMClient(selectedProvider, apiKey, customBaseUrl);
      }

      const tone = personality.tone < 33 ? 'direct' : personality.tone < 66 ? 'balanced' : 'conversational';
      const verbosity = personality.verbosity < 33 ? 'brief' : personality.verbosity < 66 ? 'balanced' : 'detailed';
      const formality = personality.formality < 33 ? 'casual' : personality.formality < 66 ? 'balanced' : 'professional';

      const prompt = `Generate a detailed personality markdown for an AI agent with the following characteristics:

Name: ${answers.name || 'Assistant'}
Goals: ${answers.goals?.join(', ') || 'General assistance'}
Communication Style: ${tone}, ${verbosity}, ${formality}

Create a comprehensive personality markdown document with the following sections:
1. # Agent Name (as the main title)
2. ## Identity (who the agent is and its purpose)
3. ## Communication Style (tone, detail level, formality guidelines)
4. ## Response Guidelines (numbered list of response rules)
5. ## Example Interactions (show 1-2 example conversations)
6. ## Domain Knowledge (areas of expertise)

Format the output as valid markdown. Keep it concise but comprehensive (around 500-1000 words).`;

      const response = await llmClient.complete({
        messages: [
          { role: 'system', content: 'You are an expert at creating AI agent personalities. Output only valid markdown, no code blocks or explanations.' },
          { role: 'user', content: prompt },
        ],
      });

      const generatedMd = response.content.trim();
      
      try {
        compilePersonality(generatedMd, 1, 'gold');
        setPersonalityMd(generatedMd);
        updateAnswers({
          personalityMd: generatedMd,
          usePersonalityMd: true,
        });
        toast.success('Personality generated successfully!');
      } catch (validationError) {
        toast.error('Generated personality has validation errors. Please try again.');
        console.error('Validation error:', validationError);
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate personality. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-white">Personality Configuration</h2>
        <p className="text-[#888888]">
          Define how your agent communicates. Use quick sliders or advanced markdown for full control.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleModeChange('sliders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            mode === 'sliders'
              ? 'bg-[#3B82F6] text-white'
              : 'bg-[#1a1a1a] text-[#A1A1A1] hover:text-white border border-[#262626]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Quick Setup
        </button>
        <button
          onClick={() => handleModeChange('markdown')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            mode === 'markdown'
              ? 'bg-[#3B82F6] text-white'
              : 'bg-[#1a1a1a] text-[#A1A1A1] hover:text-white border border-[#262626]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Advanced (Markdown)
        </button>
      </div>

      {mode === 'sliders' ? (
        <div className="space-y-6 bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base text-white">Communication Style</Label>
              <span className="text-sm font-medium text-[#3B82F6]">
                {getToneLabel(personality.tone)}
              </span>
            </div>
            <div className="space-y-2">
              <Slider
                value={[personality.tone]}
                onValueChange={([value]) => handleSliderChange('tone', value)}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#888888]">
                <span>Direct</span>
                <span>Conversational</span>
              </div>
            </div>
            <p className="text-sm text-[#888888]">
              {personality.tone < 33
                ? 'Quick, to-the-point responses without extra explanation'
                : personality.tone < 66
                ? 'Balanced communication with clear explanations'
                : 'Friendly, detailed responses with context and examples'}
            </p>
          </div>

          <div className="space-y-4 pt-6 border-t border-[#333333]">
            <div className="flex items-center justify-between">
              <Label className="text-base text-white">Detail Level</Label>
              <span className="text-sm font-medium text-[#3B82F6]">
                {getVerbosityLabel(personality.verbosity)}
              </span>
            </div>
            <div className="space-y-2">
              <Slider
                value={[personality.verbosity]}
                onValueChange={([value]) => handleSliderChange('verbosity', value)}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#888888]">
                <span>Brief</span>
                <span>Detailed</span>
              </div>
            </div>
            <p className="text-sm text-[#888888]">
              {personality.verbosity < 33
                ? 'Minimal details, just the essentials'
                : personality.verbosity < 66
                ? 'Moderate detail with key information'
                : 'Comprehensive explanations with full context'}
            </p>
          </div>

          <div className="space-y-4 pt-6 border-t border-[#333333]">
            <div className="flex items-center justify-between">
              <Label className="text-base text-white">Formality</Label>
              <span className="text-sm font-medium text-[#3B82F6]">
                {getFormalityLabel(personality.formality)}
              </span>
            </div>
            <div className="space-y-2">
              <Slider
                value={[personality.formality]}
                onValueChange={([value]) => handleSliderChange('formality', value)}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#888888]">
                <span>Casual</span>
                <span>Professional</span>
              </div>
            </div>
            <p className="text-sm text-[#888888]">
              {personality.formality < 33
                ? 'Relaxed, friendly tone with informal language'
                : personality.formality < 66
                ? 'Professional yet approachable communication'
                : 'Formal, business-appropriate language'}
            </p>
          </div>
        </div>
      ) : (
        <PersonalityEditor
          value={personalityMd}
          onChange={handleMarkdownChange}
          tier="gold"
          agentName={answers.name}
          onGenerateWithAI={handleGenerateWithAI}
          isGenerating={isGenerating}
        />
      )}

      {!selectedProvider && mode === 'markdown' && (
        <div className="bg-[#FEF3C7]/10 border border-[#FEF3C7]/20 rounded-lg p-4">
          <p className="text-sm text-[#FEF3C7]">
            Configure an LLM provider in settings to use AI-assisted personality generation.
          </p>
        </div>
      )}
    </div>
  );
}
