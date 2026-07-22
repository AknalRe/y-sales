import { useEffect, useState } from 'react';
import { generateFaviconFromUrl } from '@/lib/favicon';

type StyleLike = {
    backgroundColor?: string;
    color?: string;
};

function resolveColors(): StyleLike {
    if (typeof document === 'undefined') return {};
    const cs = getComputedStyle(document.documentElement);

    const bg =
        cs.getPropertyValue('--admin-bg').trim() ||
        cs.getPropertyValue('--sales-bg').trim() ||
        cs.getPropertyValue('--platform-bg').trim() ||
        cs.backgroundColor ||
        '#ffffff';

    const fg =
        cs.getPropertyValue('--admin-foreground').trim() ||
        cs.getPropertyValue('--sales-foreground').trim() ||
        cs.getPropertyValue('--platform-text').trim() ||
        cs.color ||
        '#0f172a';

    return { backgroundColor: bg, color: fg };
}

function generateFaviconFromInitial(text: string): string {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const letter = (text || '?').charAt(0).toUpperCase();
    const radius = 16;
    const colors = resolveColors();
    const bg = colors.backgroundColor ?? '#ffffff';
    const fg = colors.color ?? '#0f172a';

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = fg;
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, size / 2, size / 2);

    return canvas.toDataURL('image/png');
}

type UseFaviconOptions = {
    url?: string | null;
    fallbackInitial?: string;
    dark?: boolean;
};

export function useFavicon({ url, fallbackInitial, dark }: UseFaviconOptions): string {
    const [href, setHref] = useState<string>('');

    useEffect(() => {
        let cancelled = false;

        async function update() {
            if (url) {
                try {
                    const dataUrl = await generateFaviconFromUrl({ url });
                    if (!cancelled) { setHref(dataUrl); return; }
                } catch {
                    if (cancelled) return;
                }
            }

            if (fallbackInitial) {
                try {
                    const dataUrl = generateFaviconFromInitial(fallbackInitial);
                    if (!cancelled) { setHref(dataUrl); return; }
                } catch {
                    if (cancelled) return;
                }
            }

            if (!cancelled) setHref('');
        }

        update();
        return () => { cancelled = true; };
    }, [url, fallbackInitial, dark]);

    return href;
}
