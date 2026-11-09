import { useCallback, useEffect, useRef, useState } from 'react';

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for insecure contexts / older browsers.
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand?.('copy') ?? false;
    el.remove();
    return ok;
  }
}

/** Copies text and remembers which key was copied for ~2s of "Copied!" feedback. */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async (key: string, text: string) => {
    const ok = await writeClipboard(text);
    if (ok) {
      setCopied(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2000);
    }
    return ok;
  }, []);

  return { copied, copy };
}
