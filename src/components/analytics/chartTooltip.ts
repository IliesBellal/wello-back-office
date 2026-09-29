import type { CSSProperties } from 'react';

// Style commun des tooltips Recharts des analyses : fond blanc, texte sombre.
// Les séries restent identifiées par leur nom ; le texte n'emprunte pas leur
// couleur, trop pâle sur fond blanc pour certaines teintes de la palette.
const TEXT_COLOR = '#111827';

export const chartTooltipStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  color: TEXT_COLOR,
};

export const chartTooltipProps = {
  contentStyle: chartTooltipStyle,
  labelStyle: { color: TEXT_COLOR, fontWeight: 600 },
  itemStyle: { color: TEXT_COLOR },
};
