import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ArrowUp, Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from './useSpeechRecognition';

export interface ComposerHandle {
  focus: () => void;
}

interface Props {
  disabled?: boolean;
  onSubmit: (text: string, input: 'text' | 'voice', extra: Record<string, unknown>) => void;
  onVoiceStart: () => void;
  onVoiceError: (error: string) => void;
  onVoiceResult: (info: { confidence: number; durationMs: number; length: number }) => void;
}

export const AssistantComposer = forwardRef<ComposerHandle, Props>(function AssistantComposer(
  { disabled, onSubmit, onVoiceStart, onVoiceError, onVoiceResult },
  ref,
) {
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  const firstKeyAt = useRef<number | null>(null);
  const speech = useSpeechRecognition({
    onStart: onVoiceStart,
    onError: onVoiceError,
    onFinal: (transcript, info) => {
      onVoiceResult({ ...info, length: transcript.length });
      onSubmit(transcript, 'voice', { voice_confidence: Math.round(info.confidence * 100) / 100, voice_ms: info.durationMs });
    },
  });

  useImperativeHandle(ref, () => ({ focus: () => area.current?.focus() }), []);

  // Hauteur automatique, 1 à 4 lignes.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [text]);

  const send = () => {
    const value = text.trim();
    if (!value || disabled) return;
    const typingMs = firstKeyAt.current ? Date.now() - firstKeyAt.current : undefined;
    firstKeyAt.current = null;
    setText('');
    onSubmit(value, 'text', typingMs ? { typing_ms: typingMs } : {});
  };

  if (speech.listening) {
    return (
      <div className="flex min-h-[52px] items-center gap-3 rounded-[26px] border border-primary/30 bg-primary/[0.04] py-1.5 pl-4 pr-1.5">
        <span className="flex h-5 items-end gap-[3px]" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-[3px] animate-pulse rounded-full bg-primary"
              style={{ height: `${8 + ((i * 5) % 12)}px`, animationDelay: `${i * 120}ms`, animationDuration: '700ms' }}
            />
          ))}
        </span>
        <p className={cn('min-w-0 flex-1 truncate text-[15px]', speech.interim ? 'text-foreground' : 'text-muted-foreground')}>
          {speech.interim || 'Je vous écoute…'}
        </p>
        <button
          type="button"
          onClick={speech.stop}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-95"
          aria-label="Arrêter la dictée"
        >
          <Square className="h-3.5 w-3.5" fill="currentColor" />
        </button>
      </div>
    );
  }

  const hasText = text.trim().length > 0;
  return (
    <div className="flex items-end gap-1 rounded-[26px] border border-border bg-background py-1.5 pl-4 pr-1.5 transition-shadow focus-within:border-primary/40 focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]">
      <textarea
        ref={area}
        rows={1}
        value={text}
        disabled={disabled}
        onChange={(e) => {
          if (!firstKeyAt.current) firstKeyAt.current = Date.now();
          setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Demandez quelque chose…"
        aria-label="Votre demande"
        enterKeyHint="send"
        className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[16px] leading-6 outline-none placeholder:text-muted-foreground md:text-[15px]"
      />
      {hasText || !speech.supported ? (
        <button
          type="button"
          onClick={send}
          disabled={!hasText || disabled}
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all active:scale-95 disabled:bg-muted disabled:text-muted-foreground"
          aria-label="Envoyer"
        >
          <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.4} />
        </button>
      ) : (
        <button
          type="button"
          onClick={speech.start}
          disabled={disabled}
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          aria-label="Dicter une demande"
        >
          <Mic className="h-[19px] w-[19px]" />
        </button>
      )}
    </div>
  );
});
