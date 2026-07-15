export type Rgb = { r: number; g: number; b: number; a: number };

export type ColorFormats = { rgb: string; hex: string; oklch: string };

export type ColorSource = { name: string; value: string; kind: 'color' | 'shadow' };

export type AdminToken = {
    name: string;
    base: string;
    value: string;
    darkValue: string;
    section: string;
    kind: 'color' | 'shadow';
};

export function extractColor(input: string): string {
    const m = input.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|var\([^)]*\)|hsla?\([^)]*\)/);
    return m ? m[0] : input;
}

/** Resolve any CSS color (incl. var() references) to an `rgb()`/`rgba()` string via a DOM probe. */
export function resolveColor(value: string, dark = false): string {
    if (typeof document === 'undefined') return '';
    const probe = document.createElement('div');
    if (dark) probe.className = 'dark';
    Object.assign(probe.style, { position: 'fixed', left: '-9999px', top: '0', width: '0', height: '0' });
    probe.style.background = value;
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).backgroundColor;
    document.body.removeChild(probe);
    return rgb;
}

export function parseRgb(rgb: string): Rgb {
    const m = rgb.match(/rgba?\(([^)]+)\)/);
    if (!m) return { r: 0, g: 0, b: 0, a: 1 };
    const [r, g, b, a = 1] = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
}

export function toHex({ r, g, b, a }: Rgb): string {
    const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    let hex = '#' + h(r) + h(g) + h(b);
    if (a < 1) hex += h(a * 255);
    return hex;
}

export function rgbToOklch({ r, g, b, a }: Rgb): string {
    const lin = [r, g, b].map((v) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const [R, G, B] = lin;
    const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
    const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
    const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
    const aC = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const bC = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
    const C = Math.sqrt(aC * aC + bC * bC);
    let H = (Math.atan2(bC, aC) * 180) / Math.PI;
    if (H < 0) H += 360;
    const alpha = a < 1 ? ` / ${Number(a.toFixed(3))}` : '';
    return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)}${alpha})`;
}

export function deriveFormats(rgb: string): ColorFormats {
    const c = parseRgb(rgb);
    return { rgb, hex: toHex(c), oklch: rgbToOklch(c) };
}

export function toFormats(source: ColorSource, dark = false): ColorFormats {
    const base = source.kind === 'shadow' ? extractColor(source.value) || source.value : source.value;
    return deriveFormats(resolveColor(base, dark));
}
