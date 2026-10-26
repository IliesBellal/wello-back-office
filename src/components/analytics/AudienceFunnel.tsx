import { pct } from '@/components/analytics/channelFormat';

export interface AudienceFunnelStep {
  key: string;
  label: string;
  value: number;
}

/**
 * Entonnoir d'une mesure d'audience : chaque étape en part de la première,
 * et la perte depuis l'étape précédente.
 */
export function AudienceFunnel({ steps, color, topLabel }: { steps: AudienceFunnelStep[]; color: string; topLabel: string }) {
  const top = steps[0]?.value ?? 0;
  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const previous = i > 0 ? steps[i - 1].value : null;
        const width = top > 0 ? Math.max(2, (step.value / top) * 100) : 0;
        return (
          <div key={step.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{step.label}</span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{step.value.toLocaleString('fr-FR')}</span>
                {i > 0 && ` · ${pct(step.value, top)} des ${topLabel}`}
                {previous !== null && previous > 0 && step.value < previous && (
                  <span className="text-destructive"> · −{pct(previous - step.value, previous)}</span>
                )}
              </span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-muted">
              <div className="h-2.5 rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
