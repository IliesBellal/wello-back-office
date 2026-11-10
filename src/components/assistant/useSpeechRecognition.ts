/**
 * Dictée vocale via la Web Speech API du navigateur (gratuite, sans serveur
 * Wello) : Chrome / Edge / Android, Safari iOS 14.5+. Absente de Firefox :
 * le bouton micro est alors masqué.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: SpeechAlternative }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechCallbacks {
  onStart?: () => void;
  onFinal: (transcript: string, info: { confidence: number; durationMs: number }) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition(callbacks: SpeechCallbacks) {
  const supported = getCtor() !== null;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(callbacks);
  cb.current = callbacks;

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || rec.current) return;
    const r = new Ctor();
    r.lang = 'fr-FR';
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    const t0 = Date.now();
    let finalText = '';
    let confidence = 0;
    r.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          finalText += res[0].transcript;
          confidence = res[0].confidence;
        } else live += res[0].transcript;
      }
      setInterim((finalText + ' ' + live).trim());
    };
    r.onerror = (e) => {
      if (e.error !== 'aborted' && e.error !== 'no-speech') cb.current.onError?.(e.error);
      if (e.error === 'no-speech') cb.current.onError?.('no-speech');
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      setInterim('');
      if (finalText.trim()) cb.current.onFinal(finalText.trim(), { confidence, durationMs: Date.now() - t0 });
    };
    rec.current = r;
    setListening(true);
    cb.current.onStart?.();
    try {
      r.start();
    } catch {
      rec.current = null;
      setListening(false);
    }
  }, []);

  useEffect(() => () => rec.current?.abort(), []);

  return { supported, listening, interim, start, stop };
}
