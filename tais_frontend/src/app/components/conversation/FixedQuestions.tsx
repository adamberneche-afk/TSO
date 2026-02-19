import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle2, Circle, MessageSquare } from 'lucide-react';
import { FIXED_QUESTIONS, type FixedQuestion } from '../../../types/conversation';

interface FixedQuestionsProps {
  currentIndex: number;
  onQuestionClick?: (index: number) => void;
  completedIndices?: number[];
}

const getCategoryColor = (category: FixedQuestion['category']): string => {
  switch (category) {
    case 'background':
      return 'bg-[#3B82F6]/10 text-[#93C5FD] border-[#3B82F6]/20';
    case 'skills':
      return 'bg-[#A855F7]/10 text-[#C4B5FD] border-[#A855F7]/20';
    case 'goals':
      return 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/20';
    default:
      return 'bg-white/5 text-[#A1A1A1] border-white/10';
  }
};

export const FixedQuestions: React.FC<FixedQuestionsProps> = ({
  currentIndex,
  onQuestionClick,
  completedIndices = []
}) => {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-[#3B82F6]" />
        <h3 className="font-semibold text-[#EDEDED] text-xs uppercase tracking-widest">Interview Questions</h3>
        <Badge variant="outline" className="ml-auto border-[#262626] text-[#A1A1A1]">
          {Math.min(currentIndex + 1, FIXED_QUESTIONS.length)} / {FIXED_QUESTIONS.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {FIXED_QUESTIONS.map((question, index) => {
          const isActive = index === currentIndex;
          const isCompleted = completedIndices.includes(index);
          const isPending = index > currentIndex;

          return (
            <Card
              key={question.id}
              className={`cursor-pointer transition-all duration-200 bg-[#141415] border-[#262626] ${
                isActive
                  ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]/50 bg-[#3B82F6]/5'
                  : isCompleted
                    ? 'border-[#4ADE80]/30 bg-[#4ADE80]/5'
                    : 'hover:border-white/10 hover:bg-white/[0.02]'
              } ${isPending ? 'opacity-50' : ''}`}
              onClick={() => onQuestionClick?.(index)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#4ADE80]" />
                    ) : isActive ? (
                      <div className="w-5 h-5 rounded-full bg-[#3B82F6] flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      </div>
                    ) : (
                      <Circle className="w-5 h-5 text-[#262626]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[#717171] uppercase tracking-widest">
                        Question {index + 1}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs border ${getCategoryColor(question.category)}`}
                      >
                        {question.category}
                      </Badge>
                    </div>
                    
                    <p className={`text-sm ${isActive ? 'text-[#EDEDED] font-medium' : 'text-[#A1A1A1]'}`}>
                      {question.question}
                    </p>

                    {isActive && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs text-[#717171]">Looking for:</span>
                        {question.expectedEntities.map((entity) => (
                          <Badge
                            key={entity}
                            variant="outline"
                            className="text-xs px-1.5 py-0 border-[#262626] text-[#A1A1A1]"
                          >
                            {entity}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-[#717171] mb-1 uppercase tracking-widest">
          <span>Progress</span>
          <span>{Math.round((currentIndex / FIXED_QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-[#262626] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#3B82F6] to-[#A855F7] transition-all duration-300"
            style={{ width: `${(currentIndex / FIXED_QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
