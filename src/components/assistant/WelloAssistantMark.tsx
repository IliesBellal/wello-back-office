/**
 * Marque de l'assistant : le W de WelloResto (vectorisé depuis
 * public/wello_resto_logo.png) au dégradé bleu de la marque sur une pastille
 * blanche, accompagné de trois étoiles « IA » en haut à droite.
 * Version fichier : public/wello-assistant.svg.
 */
import { useId } from 'react';
import { cn } from '@/lib/utils';

/** Tracé du W, repère 665 × 432. */
export const WELLO_W_PATH =
  'M418.1 427.0C385.7 422.5 361.8 398.4 348.0 356.1C342.6 339.5 340.7 330.0 334.0 283.8C327.6 239.7 326.6 234.0 324.3 227.0C318.0 208.4 302.0 205.7 291.6 221.4C287.8 227.1 282.3 239.9 279.5 249.6C275.3 264.2 261.3 301.6 256.0 312.5C247.6 329.7 241.1 339.1 229.6 350.5C214.2 365.8 202.1 371.0 182.0 371.0C165.9 371.0 165.8 370.9 174.3 364.1C199.4 344.0 209.6 326.3 235.2 258.0C259.6 193.0 266.0 180.4 282.9 164.8C304.3 144.9 333.6 143.3 355.7 160.9C369.8 172.2 375.2 187.8 384.0 242.9C391.2 288.1 395.0 301.5 403.4 310.8C410.5 318.6 422.0 320.1 431.4 314.6C441.8 308.5 446.5 298.8 455.4 264.8C459.4 249.5 495.8 123.4 505.6 90.5C519.8 43.3 538.1 21.9 573.8 10.6C597.3 3.2 637.1 2.0 653.6 8.1C661.8 11.2 662.4 12.6 657.0 16.9C626.0 42.0 615.0 65.9 581.4 182.0C550.9 287.0 544.9 306.7 537.8 326.0C518.6 377.7 498.1 404.8 467.4 419.2C452.4 426.2 433.7 429.2 418.1 427.0ZM133.1 351.4C113.5 331.2 94.0 288.9 77.9 231.7C61.5 173.2 46.4 121.9 43.0 113.2C33.5 88.8 25.5 77.9 11.5 70.3C3.1 65.7 2.8 64.3 10.0 60.8C23.0 54.3 58.9 53.0 79.1 58.3C109.9 66.4 135.0 88.2 144.6 115.2C145.4 117.6 149.7 132.8 154.1 149.0C171.2 211.8 189.4 273.1 192.6 278.7C195.2 283.3 201.2 288.0 204.4 288.0C207.1 288.0 206.1 291.9 199.5 305.7C184.7 336.8 164.5 356.5 145.8 357.8L139.8 358.3L133.1 351.4Z';

const SPARKLE_PATH = 'M0 -1C0.14 -0.14 0.14 -0.14 1 0C0.14 0.14 0.14 0.14 0 1C-0.14 0.14 -0.14 0.14 -1 0C-0.14 -0.14 -0.14 -0.14 0 -1Z';

interface Props {
  size?: number;
  className?: string;
}

/** Étoiles [x, y, rayon] : une grande (≈ 40 % du logo), une moyenne, une petite. */
const STARS: Array<[number, number, number]> = [
  [66, 32, 16],
  [84, 50, 7.5],
  [82, 15, 5],
];

export function WelloAssistantMark({ size = 40, className }: Props) {
  const id = useId().replace(/:/g, '');
  const fill = `url(#wam-${id})`;
  // Sous 32 px, la petite étoile n'est plus lisible.
  const stars = size >= 32 ? STARS : STARS.slice(0, 2);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className={cn('shrink-0 rounded-full', className)}>
      <defs>
        <linearGradient id={`wam-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'hsl(var(--primary-gradient-from))' }} />
          <stop offset="1" style={{ stopColor: 'hsl(var(--primary-gradient-to))' }} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="49.5" fill="#fff" stroke="hsl(var(--border))" strokeWidth="1" />
      <path fill={fill} fillRule="evenodd" transform="translate(15 45) scale(0.072)" d={WELLO_W_PATH} />
      {stars.map(([x, y, r]) => (
        <path key={`${x}-${y}`} fill={fill} transform={`translate(${x} ${y}) scale(${r})`} d={SPARKLE_PATH} />
      ))}
    </svg>
  );
}
