const ALLOWED_PHONE_CHARS = /^[0-9+\-\s()]*$/;

const ALLOWED_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

const ALLOWED_CTRL_KEYS = new Set(['a', 'c', 'v', 'x']);

function isAllowedKey(key: string, ctrlKey: boolean, metaKey: boolean): boolean {
  if (ALLOWED_KEYS.has(key)) return true;
  if ((ctrlKey || metaKey) && ALLOWED_CTRL_KEYS.has(key.toLowerCase())) return true;
  if (/^[0-9]$/.test(key)) return true;
  if (['+', '-', '(', ')', ' '].includes(key)) return true;
  return false;
}

function getTextFromClipboard(e: React.ClipboardEvent<HTMLInputElement>): string {
  return e.clipboardData?.getData('text') ?? '';
}

function getTextFromDrop(e: React.DragEvent<HTMLInputElement>): string {
  return e.dataTransfer?.getData('text') ?? '';
}

export function usePhoneInput() {
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isAllowedKey(e.key, e.ctrlKey, e.metaKey)) return;
    e.preventDefault();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = getTextFromClipboard(e);
    if (!ALLOWED_PHONE_CHARS.test(text)) {
      e.preventDefault();
    }
  };

  const onDrop = (e: React.DragEvent<HTMLInputElement>) => {
    const text = getTextFromDrop(e);
    if (!ALLOWED_PHONE_CHARS.test(text)) {
      e.preventDefault();
    }
  };

  return {
    onKeyDown,
    onPaste,
    onDrop,
  };
}
