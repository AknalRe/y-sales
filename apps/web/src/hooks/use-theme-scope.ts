import { useEffect } from 'react';

export type ThemeScope = 'admin' | 'sales' | 'platform' | 'brand';

/**
 * Applies a UI theme scope at the document level by setting `data-theme`
 * on <html>. Shared UI components — including portaled ones (Dialog, Select,
 * Toast, Combobox, ...) — inherit the palette because portals mount under
 * <html>, which is their ancestor.
 */
export function useThemeScope(theme: ThemeScope) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}
