/*
 * Background and text colors taken from the artwork, like Home Assistant's media control card:
 * the most common color is the background, and the most common one that reads well on it is the text.
 */

export interface ArtworkColors {
  background: string;
  foreground: string;
}

type Rgb = [number, number, number];

interface Swatch {
  rgb: Rgb;
  population: number;
}

const SAMPLE_PX = 48;
/** WCAG AA for normal text. */
const MIN_CONTRAST = 4.5;
/** A text color must cover this share of the image, so stray pixels don't win. */
const MIN_SHARE = 0.01;

const luminance = ([r, g, b]: Rgb): number => {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

export const contrast = (a: Rgb, b: Rgb): number => {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const css = ([r, g, b]: Rgb): string => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

/** Groups RGBA pixels into coarse color buckets (3 bits per channel), most common first. */
export function swatches(data: ArrayLike<number>): Swatch[] {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 125) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const s = buckets.get(key);
    if (s) {
      s.r += r;
      s.g += g;
      s.b += b;
      s.n++;
    } else buckets.set(key, { r, g, b, n: 1 });
  }
  return [...buckets.values()]
    .map(({ r, g, b, n }): Swatch => ({ rgb: [r / n, g / n, b / n], population: n }))
    .sort((x, y) => y.population - x.population);
}

export function pickColors(list: Swatch[]): ArtworkColors | null {
  const bg = list[0];
  if (!bg) return null;
  const total = list.reduce((sum, s) => sum + s.population, 0);
  const fg = list.find((s) => s !== bg && s.population / total >= MIN_SHARE && contrast(s.rgb, bg.rgb) >= MIN_CONTRAST);
  const plain: Rgb = contrast([255, 255, 255], bg.rgb) >= contrast([0, 0, 0], bg.rgb) ? [255, 255, 255] : [0, 0, 0];
  return { background: css(bg.rgb), foreground: css(fg ? fg.rgb : plain) };
}

const cache = new Map<string, Promise<ArtworkColors | null>>();

/** null when the image can't be read (it failed to load, or another origin without CORS). */
export function artworkColors(url: string): Promise<ArtworkColors | null> {
  let p = cache.get(url);
  if (!p) {
    p = extract(url);
    cache.set(url, p);
    if (cache.size > 30) cache.delete(cache.keys().next().value as string);
  }
  return p;
}

async function extract(url: string): Promise<ArtworkColors | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SAMPLE_PX;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, SAMPLE_PX, SAMPLE_PX);
    return pickColors(swatches(ctx.getImageData(0, 0, SAMPLE_PX, SAMPLE_PX).data));
  } catch (_) {
    return null;
  }
}
