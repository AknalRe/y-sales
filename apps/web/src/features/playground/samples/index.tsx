import { useEffect, useMemo, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { type AdminToken, type ColorFormats, deriveFormats, extractColor } from '@/lib/color';
import {
    Tooltip,
    TooltipProvider,
    TooltipTrigger,
    TooltipPortal,
    TooltipPositioner,
    TooltipPopup,
} from '@/components/ui-composed/module/tooltip';

const PREFIX = '--admin-';

type TokenDecl = { name: string; value: string; section: string };

const rawModules = import.meta.glob('../../../assets/css/palete-color-admin.css', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;
const RAW = Object.values(rawModules)[0] ?? '';

function cleanSection(raw: string): string {
    let s = raw.replace(/[─\s]+/g, ' ').trim();
    s = s.replace(/\(.*?\)/g, '').trim();
    s = s.replace(/\s*—\s*(light|dark)\s*mode.*$/i, '').trim();
    return s || 'General';
}

function isShadowValue(value: string): boolean {
    return /\d(px|rem|em|%|vh|vw)/.test(value);
}

function extractDecls(block: string): TokenDecl[] {
    const result: TokenDecl[] = [];
    let section = 'General';
    const re = /\/\*([^*]+?)\*\/|--(admin-[\w-]+)\s*:\s*([^;]+);/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block))) {
        if (m[1] !== undefined) {
            section = cleanSection(m[1]);
        } else {
            result.push({ name: '--' + m[2], value: m[3].trim(), section });
        }
    }
    return result;
}

function buildTokens(raw: string): AdminToken[] {
    const rootBlock = raw.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';
    const darkBlock = raw.match(/\.dark\s*\{([^}]*)\}/)?.[1] ?? '';
    const darkMap: Record<string, string> = {};
    const dre = /--(admin-[\w-]+)\s*:\s*([^;]+);/g;
    let dm: RegExpExecArray | null;
    while ((dm = dre.exec(darkBlock))) darkMap['--' + dm[1]] = dm[2].trim();

    return extractDecls(rootBlock).map((d) => {
        const base = d.name.slice(PREFIX.length);
        return {
            ...d,
            base,
            kind: isShadowValue(d.value) ? 'shadow' : 'color',
            darkValue: darkMap[d.name] ?? d.value,
        };
    });
}

function groupBySection(tokens: AdminToken[]): { title: string; items: AdminToken[] }[] {
    const order: string[] = [];
    const map: Record<string, AdminToken[]> = {};
    for (const t of tokens) {
        if (!map[t.section]) {
            map[t.section] = [];
            order.push(t.section);
        }
        map[t.section].push(t);
    }
    return order.map((title) => ({ title, items: map[title] }));
}

const GROUPS = RAW ? groupBySection(buildTokens(RAW)) : [];

/** Mirror the global theme (navbar toggle) by observing the `.dark` class on <html>. */
function useGlobalDark(): boolean {
    const [isDark, setIsDark] = useState(
        () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
    );
    useEffect(() => {
        const el = document.documentElement;
        const observer = new MutationObserver(() => setIsDark(el.classList.contains('dark')));
        observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    return isDark;
}

function Swatch({ token, dark }: { token: AdminToken; dark: boolean }) {
    const utility = token.kind === 'shadow' ? `shadow-admin-${token.base}` : `bg-admin-${token.base}`;
    // Box uses the token's CSS variable directly, so it auto-follows the global Light/Dark theme.
    const boxClass = `h-10 w-10 shrink-0 rounded-xl ${token.kind === 'shadow' ? 'bg-white' : ''} ring-1 ring-black/10`;
    const boxStyle =
        token.kind === 'shadow'
            ? { boxShadow: `var(${token.name})` }
            : { background: `var(${token.name})` };

    const boxRef = useRef<HTMLDivElement>(null);
    const [formats, setFormats] = useState<ColorFormats>();

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const cs = getComputedStyle(el);
        const color = token.kind === 'shadow' ? extractColor(cs.boxShadow) || `var(${token.name})` : cs.backgroundColor;
        setFormats(deriveFormats(color));
    }, [dark, token]);

    return (
        <div className="flex items-center gap-3">
            <div ref={boxRef} className={boxClass} style={boxStyle} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-admin-foreground">{token.name}</p>
                    {formats && (
                        <Tooltip>
                            <TooltipTrigger
                                aria-label="Lihat format warna"
                                className="shrink-0 rounded-md p-0.5 text-admin-muted hover:bg-admin-surface-hover hover:text-admin-foreground"
                            >
                                <Info className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipPortal>
                                <TooltipPositioner sideOffset={8}>
                                    <TooltipPopup
                                        className="font-mono text-xs"
                                        style={{
                                            backgroundColor: 'var(--admin-bg-card)',
                                            color: 'var(--admin-foreground)',
                                            border: '1px solid var(--admin-border-strong)',
                                            boxShadow: '0 12px 24px -6px rgba(15, 23, 42, 0.28)',
                                        }}
                                    >
                                        <p className="text-admin-muted">hex&nbsp;&nbsp;&nbsp;{formats.hex}</p>
                                        <p className="text-admin-muted">rgb&nbsp;&nbsp;&nbsp;{formats.rgb}</p>
                                        <p className="text-admin-muted">oklch&nbsp;{formats.oklch}</p>
                                    </TooltipPopup>
                                </TooltipPositioner>
                            </TooltipPortal>
                        </Tooltip>
                    )}
                </div>
                <p className="truncate font-mono text-[11px] text-admin-accent">{utility}</p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-admin-muted">raw&nbsp;&nbsp;{token.value}</p>
            </div>
        </div>
    );
}

export default function SamplePage() {
    const dark = useGlobalDark();
    const groups = useMemo(() => GROUPS, []);

    return (
        <TooltipProvider>
            <div className="space-y-8 p-6">
                <div>
                    <h1 className="text-2xl font-black text-admin-foreground">Admin Palette</h1>
                    <p className="mt-1 max-w-2xl text-sm text-admin-muted">
                        Katalog token dibaca otomatis dari{' '}
                        <code className="rounded bg-admin-surface px-1.5 py-0.5 font-mono text-xs text-admin-accent">
                            palete-color-admin.css
                        </code>{' '}
                        via <code className="rounded bg-admin-surface px-1.5 py-0.5 font-mono text-xs text-admin-accent">import.meta.glob</code>.
                        Tiap warna otomatis mengikuti tema Light/Dark global dari navbar (swatch memakai
                        variabel CSS token, bukan nilai statis).
                        Tambah/hapus <code className="rounded bg-admin-surface px-1.5 py-0.5 font-mono text-xs text-admin-accent">--admin-*</code> di
                        palette, tampilan langsung sinkron (HMR / refresh).
                    </p>
                </div>

                {groups.length === 0 ? (
                    <div className="admin-card text-sm text-admin-muted">
                        Palette source (<code className="font-mono text-admin-accent">palete-color-admin.css</code>) tidak
                        terbaca — periksa import <code className="font-mono text-admin-accent">import.meta.glob</code>.
                    </div>
                ) : (
                    <div className={dark ? 'dark space-y-8' : 'space-y-8'}>
                        {groups.map((g) => (
                            <section key={g.title} className="admin-card">
                                <h2 className="mb-4 text-lg font-black text-admin-foreground">{g.title}</h2>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {g.items.map((t) => (
                                        <Swatch key={t.name} token={t} dark={dark} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
