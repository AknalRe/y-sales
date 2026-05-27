import { useEffect, useState } from 'react';

export function useDialogAnimation(open: boolean, durationMs = 200) {
  const [shouldRender, setShouldRender] = useState(open);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const frame = window.requestAnimationFrame(() => setMounted(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setMounted(false);
    const timeout = window.setTimeout(() => setShouldRender(false), durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, open]);

  return { shouldRender, mounted };
}
