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
      return 'bg-blue-100 text-blue-800';
    case 'skills':
      return 'bg-purple-100 text-purple-800';
    case 'goals':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
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
        <MessageSquare className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-800">Interview Questions</h3>
        <Badge variant="outline" className="ml-auto">
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
              className={`cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'border-blue-500 ring-1 ring-blue-500 shadow-md'
                  : isCompleted
                    ? 'border-green-300 bg-green-50/50'
                    : 'border-gray-200 hover:border-gray-300'
              } ${isPending ? 'opacity-60' : ''}`}
              onClick={() => onQuestionClick?.(index)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : isActive ? (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      </div>
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>

                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        Question {index + 1}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getCategoryColor(question.category)}`}
                      >
                        {question.category}
                      </Badge>
                    </div>
                    
                    <p className={`text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                      {question.question}
                    </p>

                    {/* Expected Entities */}
                    {isActive && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs text-gray-400">Looking for:</span>
                        {question.expectedEntities.map((entity) => (
                          <Badge
                            key={entity}
                            variant="outline"
                            className="text-xs px-1.5 py-0"
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

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round((currentIndex / FIXED_QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(currentIndex / FIXED_QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
