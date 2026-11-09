import clsx from 'clsx';
import { MessageCircle, Send } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CHAT_MESSAGE_MAX_LENGTH, type ChatMessage } from '@arena/shared';

interface ChatPanelProps {
  messages: ChatMessage[];
  myPlayerId: string | null;
  disabled: boolean;
  onSend: (text: string) => Promise<boolean>;
}

export function ChatPanel({ messages, myPlayerId, disabled, onSend }: ChatPanelProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (typeof el.scrollTo === 'function')
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    else el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    if (await onSend(value)) setText('');
    setSending(false);
  };

  return (
    <section
      className="card flex h-[320px] flex-col overflow-hidden lg:h-[380px]"
      aria-labelledby="chat-title"
    >
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <MessageCircle className="h-4 w-4 text-brand-600" aria-hidden="true" />
        <h2 id="chat-title" className="text-sm font-bold">
          Room chat
        </h2>
      </header>
      <div
        ref={listRef}
        className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <p className="pt-8 text-center text-xs text-ink-muted">
            Say hi and wish your opponent good luck 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.playerId === myPlayerId;
          return (
            <div key={m.id} className={clsx('flex flex-col', mine ? 'items-end' : 'items-start')}>
              {!mine && (
                <span className="mb-0.5 text-[11px] font-semibold text-ink-muted">
                  {m.displayName}
                </span>
              )}
              <p
                className={clsx(
                  'max-w-[85%] break-words rounded-2xl px-3 py-2 text-sm',
                  mine
                    ? 'rounded-br-md bg-brand-600 text-white'
                    : 'rounded-bl-md bg-canvas text-ink',
                )}
              >
                {m.text}
              </p>
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line p-2.5">
        <label className="flex-1">
          <span className="sr-only">Message</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            disabled={disabled}
            placeholder={disabled ? 'Chat unavailable offline' : 'Type a message…'}
            className="w-full rounded-xl border border-transparent bg-canvas px-3 py-2 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <button
          type="submit"
          disabled={disabled || sending || !text.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
