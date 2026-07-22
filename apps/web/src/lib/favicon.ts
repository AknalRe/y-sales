const FAVICON_SIZE = 64;

export type GenerateFaviconOptions = {
    url: string;
    maxSize?: number;
};

export async function generateFaviconFromUrl({ url, maxSize = FAVICON_SIZE }: GenerateFaviconOptions): Promise<string> {
    if (!url) return '';
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.src = url;

    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Gagal memuat gambar untuk favicon.'));
    });

    const bitmap = await createImageBitmap(image);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL('image/png');
}
