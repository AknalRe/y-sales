const lightColors = [
    { label: 'Background', cssVar: '--admin-bg', tailwind: 'bg-admin-bg' },
    { label: 'Surface', cssVar: '--admin-surface', tailwind: 'bg-admin-surface' },
    { label: 'Card', cssVar: '--admin-bg-card', tailwind: 'bg-admin-bg-card' },
    { label: 'Surface Hover', cssVar: '--admin-surface-hover', tailwind: 'bg-admin-surface-hover' },
    { label: 'Border', cssVar: '--admin-border', tailwind: 'border-admin-border' },
    { label: 'Border Strong', cssVar: '--admin-border-strong', tailwind: 'border-admin-border-strong' },
    { label: 'Border Subtle', cssVar: '--admin-border-subtle', tailwind: 'border-admin-border-subtle' },
    { label: 'Foreground', cssVar: '--admin-foreground', tailwind: 'text-admin-foreground' },
    { label: 'Text', cssVar: '--admin-text', tailwind: 'text-admin-text' },
    { label: 'Muted', cssVar: '--admin-muted', tailwind: 'text-admin-muted' },
    { label: 'Muted Dim', cssVar: '--admin-muted-dim', tailwind: 'text-admin-muted-dim' },
    { label: 'Subtle', cssVar: '--admin-subtle', tailwind: 'text-admin-subtle' },
];

const accentColors = [
    { label: 'Accent', cssVar: '--admin-accent', twBg: 'bg-admin-accent', twText: 'text-admin-accent' },
    { label: 'Accent Hover', cssVar: '--admin-accent-hover', twBg: 'bg-admin-accent-hover', twText: 'text-admin-accent-hover' },
    { label: 'Accent Light', cssVar: '--admin-accent-light', twBg: 'bg-admin-accent-light', twText: 'text-admin-accent-light' },
    { label: 'Accent Shadow', cssVar: '--admin-accent-shadow', twBg: 'bg-admin-accent-shadow', twText: 'text-admin-accent-shadow' },
    { label: 'Teal', cssVar: '--admin-accent-teal', twBg: 'bg-admin-accent-teal', twText: 'text-admin-accent-teal' },
    { label: 'Teal Light', cssVar: '--admin-accent-teal-light', twBg: 'bg-admin-accent-teal-light', twText: 'text-admin-accent-teal-light' },
    { label: 'Teal BG', cssVar: '--admin-accent-teal-bg', twBg: 'bg-admin-accent-teal-bg', twText: 'text-admin-accent-teal' },
    { label: 'Blue', cssVar: '--admin-accent-blue', twBg: 'bg-admin-accent-blue', twText: 'text-admin-accent-blue' },
];

const statusColors = [
    { label: 'Danger', cssVar: '--admin-danger', twBg: 'bg-admin-danger', twText: 'text-admin-danger' },
    { label: 'Danger Light', cssVar: '--admin-danger-light', twBg: 'bg-admin-danger-light', twText: 'text-admin-danger-light' },
    { label: 'Danger BG', cssVar: '--admin-danger-bg', twBg: 'bg-admin-danger-bg', twText: 'text-admin-danger' },
    { label: 'Danger Soft', cssVar: '--admin-danger-soft', twBg: 'bg-admin-danger-soft', twText: 'text-admin-danger' },
    { label: 'Success', cssVar: '--admin-success', twBg: 'bg-admin-success', twText: 'text-admin-success' },
    { label: 'Success Soft', cssVar: '--admin-success-soft', twBg: 'bg-admin-success-soft', twText: 'text-admin-success' },
];

const shadowTokens = [
    { label: 'Shadow SM', tw: 'shadow-admin-shadow-sm' },
    { label: 'Shadow LG', tw: 'shadow-admin-shadow-lg' },
    { label: 'Shadow XL', tw: 'shadow-admin-shadow-xl' },
    { label: 'Shadow 2XL', tw: 'shadow-admin-shadow-2xl' },
    { label: 'Shadow Card', tw: 'shadow-admin-shadow-card' },
    { label: 'Shadow Dropdown', tw: 'shadow-admin-shadow-dropdown' },
];

function Swatch({ bg, label, cssVar, tailwind, dark }: { bg?: string; label: string; cssVar: string; tailwind: string; dark?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div
                className={`h-10 w-10 shrink-0 rounded-xl border border-admin-border ${bg ?? ''}`}
                style={dark ? { background: `var(${cssVar})` } : undefined}
            />
            <div className="min-w-0">
                <p className="truncate text-sm font-bold text-admin-foreground">{label}</p>
                <p className="truncate text-xs text-admin-muted">{cssVar}</p>
                <p className="truncate font-mono text-[11px] text-admin-accent">{tailwind}</p>
            </div>
        </div>
    );
}

export default function SamplePage() {
    return (
        <div className="space-y-8 p-6">
            <div>
                <h1 className="text-2xl font-black text-admin-foreground">Admin Palette</h1>
                <p className="mt-1 text-sm text-admin-muted">
                    Semua warna admin tersedia sebagai Tailwind utility: <code className="rounded bg-admin-surface px-1.5 py-0.5 font-mono text-xs text-admin-accent">bg-admin-accent</code>,{' '}
                    <code className="rounded bg-admin-surface px-1.5 py-0.5 font-mono text-xs text-admin-accent">text-admin-foreground</code>,{' '}
                    <code className="rounded bg-admin-surface px-1.5 py-0.5 font-mono text-xs text-admin-accent">border-admin-border</code>, dll.
                </p>
            </div>

            {/* Surface & Neutral */}
            <section className="admin-card">
                <h2 className="mb-4 text-lg font-black text-admin-foreground">Surface & Neutral</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {lightColors.map((c) => (
                        <Swatch key={c.cssVar} label={c.label} cssVar={c.cssVar} tailwind={c.tailwind} />
                    ))}
                </div>
            </section>

            {/* Accent & Brand */}
            <section className="admin-card">
                <h2 className="mb-4 text-lg font-black text-admin-foreground">Accent & Brand</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {accentColors.map((c) => (
                        <div key={c.cssVar} className="flex items-center gap-3">
                            <div className={`h-10 w-10 shrink-0 rounded-xl ${c.twBg}`} />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-admin-foreground">{c.label}</p>
                                <p className="truncate text-xs text-admin-muted">{c.cssVar}</p>
                                <p className="truncate font-mono text-[11px] text-admin-accent">{c.twBg}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Status */}
            <section className="admin-card">
                <h2 className="mb-4 text-lg font-black text-admin-foreground">Status</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {statusColors.map((c) => (
                        <div key={c.cssVar} className="flex items-center gap-3">
                            <div className={`h-10 w-10 shrink-0 rounded-xl ${c.twBg}`} />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-admin-foreground">{c.label}</p>
                                <p className="truncate text-xs text-admin-muted">{c.cssVar}</p>
                                <p className="truncate font-mono text-[11px] text-admin-accent">{c.twBg}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Shadows */}
            <section className="admin-card">
                <h2 className="mb-4 text-lg font-black text-admin-foreground">Shadows</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {shadowTokens.map((s) => (
                        <div key={s.tw} className="flex items-center gap-3">
                            <div className={`h-14 w-14 shrink-0 rounded-xl bg-admin-surface ${s.tw}`} />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-admin-foreground">{s.label}</p>
                                <p className="truncate font-mono text-[11px] text-admin-accent">{s.tw}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Buttons */}
            <section className="admin-card">
                <h2 className="mb-4 text-lg font-black text-admin-foreground">Buttons (Tailwind)</h2>
                <div className="flex flex-wrap gap-3">
                    <button className="rounded-2xl bg-admin-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-admin-accent-hover">
                        Primary
                    </button>
                    <button className="rounded-2xl border border-admin-border bg-admin-surface px-5 py-2.5 text-sm font-bold text-admin-foreground transition hover:border-admin-border-strong hover:bg-admin-surface-hover">
                        Secondary
                    </button>
                    <button className="rounded-2xl bg-admin-danger px-5 py-2.5 text-sm font-bold text-white transition hover:bg-admin-danger-light">
                        Danger
                    </button>
                    <button className="rounded-2xl bg-admin-success/20 px-5 py-2.5 text-sm font-bold text-admin-success transition hover:bg-admin-success/30">
                        Success Soft
                    </button>
                    <button className="rounded-2xl border border-admin-accent/30 bg-admin-accent-shadow px-5 py-2.5 text-sm font-bold text-admin-accent transition hover:border-admin-accent/50">
                        Accent Soft
                    </button>
                </div>
            </section>

            {/* Cards */}
            <section className="admin-card">
                <h2 className="mb-4 text-lg font-black text-admin-foreground">Card Surfaces</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-admin-border bg-admin-bg-card p-4">
                        <p className="text-sm font-bold text-admin-foreground">bg-admin-bg-card</p>
                        <p className="text-xs text-admin-muted">border-admin-border</p>
                    </div>
                    <div className="rounded-2xl border border-admin-border bg-admin-surface p-4">
                        <p className="text-sm font-bold text-admin-foreground">bg-admin-surface</p>
                        <p className="text-xs text-admin-muted">Surface</p>
                    </div>
                    <div className="rounded-2xl border border-admin-border-subtle bg-admin-bg p-4">
                        <p className="text-sm font-bold text-admin-foreground">bg-admin-bg</p>
                        <p className="text-xs text-admin-muted">border-admin-border-subtle</p>
                    </div>
                </div>
            </section>

            {/* Typography */}
            <section className="admin-card">
                <h2 className="mb-4 text-lg font-black text-admin-foreground">Typography</h2>
                <div className="space-y-2">
                    <p className="text-lg font-black text-admin-foreground">text-admin-foreground — Headings</p>
                    <p className="text-sm font-bold text-admin-text">text-admin-text — Body text</p>
                    <p className="text-sm font-medium text-admin-muted">text-admin-muted — Secondary labels</p>
                    <p className="text-sm text-admin-muted-dim">text-admin-muted-dim — Tertiary</p>
                    <p className="text-sm text-admin-subtle">text-admin-subtle — Very subtle</p>
                    <p className="font-mono text-sm text-admin-accent">text-admin-accent — Code & highlights</p>
                </div>
            </section>
        </div>
    );
}