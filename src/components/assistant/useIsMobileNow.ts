import { useEffect, useState } from 'react';

const BREAKPOINT = 768;
const query = () => typeof window !== 'undefined' && window.innerWidth < BREAKPOINT;

/**
 * Comme useIsMobile, mais juste dès le premier rendu (useIsMobile renvoie
 * false avant son effet) : l'animation d'ouverture du panneau en dépend.
 */
export function useIsMobileNow(): boolean {
  const [mobile, setMobile] = useState(query);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`);
    const onChange = () => setMobile(query());
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return mobile;
}
