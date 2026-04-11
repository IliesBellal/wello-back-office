/**
 * HourPerformanceIndicator - Indicateur de performance heures planifiées vs contrat
 */

import React from 'react';
import { formatHours } from '@/utils/calendarUtils';
import { AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

interface PerformanceIndicatorProps {
  scheduledHours: number; // Heures planifiées en minutes
  contractHours: number; // Heures du contrat en minutes
  className?: string;
}

export const HourPerformanceIndicator: React.FC<PerformanceIndicatorProps> = ({
  scheduledHours,
  contractHours,
  className = '',
}) => {
  const scheduledDecimal = scheduledHours / 60;
  const contractDecimal = contractHours / 60;
  const variance = scheduledHours - contractHours;
  const varianceDecimal = variance / 60;

  let status: 'under' | 'match' | 'over' = 'match';
  let statusColor = 'text-green-600';
  let statusIcon = null;
  let statusLabel = 'OK';

  if (Math.abs(variance) < 30) {
    // Moins de 30 min de différence
    status = 'match';
    statusColor = 'text-green-600';
    statusIcon = <CheckCircle className="w-4 h-4" />;
    statusLabel = 'Conforme';
  } else if (variance < 0) {
    status = 'under';
    statusColor = 'text-orange-600';
    statusIcon = <AlertCircle className="w-4 h-4" />;
    statusLabel = 'Insuffisant';
  } else if (variance > 0) {
    status = 'over';
    statusColor = 'text-blue-600';
    statusIcon = <TrendingUp className="w-4 h-4" />;
    statusLabel = 'Excédent';
  }

  return (
    <div className={`flex items-center gap-2 py-1 px-2 rounded-md bg-neutral-50 ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-neutral-700">
          {formatHours(scheduledHours)}h / {formatHours(contractHours)}h
        </div>
        <div className={`text-xs font-medium ${statusColor} flex items-center gap-1`}>
          {statusIcon}
          {statusLabel} ({varianceDecimal >= 0 ? '+' : ''}{varianceDecimal.toFixed(2)}h)
        </div>
      </div>

      {/* Barre de progression */}
      <div className="flex-shrink-0">
        <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              status === 'match'
                ? 'bg-green-500'
                : status === 'under'
                ? 'bg-orange-500'
                : 'bg-blue-500'
            }`}
            style={{
              width: `${Math.min(100, (scheduledDecimal / contractDecimal) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default HourPerformanceIndicator;
