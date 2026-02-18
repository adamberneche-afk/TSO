import React from 'react';
import { Progress } from '../ui/progress';
import { useCostDisplay } from '../../../hooks/useCostTracker';
import { AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';

interface CostDisplayProps {
  showDetails?: boolean;
  compact?: boolean;
}

export const CostDisplay: React.FC<CostDisplayProps> = ({ 
  showDetails = true, 
  compact = false 
}) => {
  const {
    currentCost,
    maxCost,
    formattedCurrent,
    formattedMax,
    formattedRemaining,
    progressPercentage,
    isTracking,
    isWarning,
    isExceeded
  } = useCostDisplay();

  if (!isTracking) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <DollarSign className="w-4 h-4" />
        <span>Cost tracking not started</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <DollarSign className={`w-4 h-4 ${isExceeded ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-green-500'}`} />
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className={isExceeded ? 'text-red-600' : 'text-gray-600'}>
              {formattedCurrent} / {formattedMax}
            </span>
            <span className={isExceeded ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'}>
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
          />
        </div>
        {isExceeded && <AlertCircle className="w-4 h-4 text-red-500" />}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${
      isExceeded ? 'bg-red-50 border-red-200' : 
      isWarning ? 'bg-yellow-50 border-yellow-200' : 
      'bg-green-50 border-green-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DollarSign className={`w-5 h-5 ${
            isExceeded ? 'text-red-500' : 
            isWarning ? 'text-yellow-500' : 
            'text-green-500'
          }`} />
          <span className="font-medium">
            Cost: {formattedCurrent} / {formattedMax}
          </span>
        </div>
        {isExceeded ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        )}
      </div>

      <Progress 
        value={progressPercentage} 
        className="h-2 mb-2"
      />

      {showDetails && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            {Math.round(progressPercentage)}% used
          </span>
          <span className={isExceeded ? 'text-red-600 font-medium' : 'text-gray-600'}>
            {isExceeded ? 'Budget exceeded!' : `${formattedRemaining} remaining`}
          </span>
        </div>
      )}
    </div>
  );
};

export default CostDisplay;
