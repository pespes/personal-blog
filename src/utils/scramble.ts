/**
 * Text scramble: animates one string into another through a flicker of
 * random characters, letters settling roughly left to right.
 *
 * Used by `Scramble.astro`; see docs/design.md (Motion). Layout never shifts:
 * the component reserves the size of the largest string, and this module only
 * swaps the text of an overlay positioned on top of it.
 */

/**
 * Preset character pools. Every character is in both Geist Pixel and Inter
 * (the site's Latin subsets) and is letter-width (0.45–0.8em in both), so the
 * scrambling line keeps an even texture. Slivers like . , ' | and very wide
 * glyphs like @ % M W are left out on purpose, as is µ: `uppercase` turns it
 * into Greek Μ, which Geist Pixel doesn't have.
 */
export const SCRAMBLE_POOLS = {
  symbols: "§±×÷¢£¥€®¶¤¬",
  punctuation: "#$&+<=>?_~«»¿",
  letters: "ABCDEFGHJKLNOPQRSTUVXYZÉ",
} as const;

export type ScramblePoolName = keyof typeof SCRAMBLE_POOLS;

/** A preset name, or a custom string of characters. */
export const resolvePool = (pool: string): string =>
  pool in SCRAMBLE_POOLS ? SCRAMBLE_POOLS[pool as ScramblePoolName] : pool;

export interface ScrambleOptions {
  /** Total duration in ms. */
  duration: number;
  /** 0–1: how much each letter's settle time is randomised (0 = clean sweep). */
  randomness: number;
  /** 0–1: chance each unsettled character changes on a given frame. */
  flicker: number;
}

export const SCRAMBLE_DEFAULTS: ScrambleOptions = {
  duration: 1000,
  randomness: 0.3,
  flicker: 0.5625,
};

// Close to CSS ease-in-out.
const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

const isSpace = (c: string) => c === " " || c === "\u00a0";

/**
 * Where `el`'s text wraps: the indices (in characters) that start a new line.
 * Read from the invisible reserved copy of a string, so a scramble can keep
 * the final text's line breaks instead of wrapping on its own.
 */
export function lineStarts(el: HTMLElement): Set<number> {
  const starts = new Set<number>();
  const node = el.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return starts;
  const range = document.createRange();
  let offset = 0; // UTF-16 offset of the current character
  let lastTop: number | undefined;
  [...(node.textContent ?? "")].forEach((c, i) => {
    range.setStart(node, offset);
    range.setEnd(node, offset + c.length);
    offset += c.length;
    if (isSpace(c)) return; // spaces at a wrap have no reliable position
    const top = range.getBoundingClientRect().top;
    if (lastTop !== undefined && top > lastTop + 1) starts.add(i);
    lastTop = top;
  });
  return starts;
}

/**
 * Animate `el.textContent` from `from` to `to`. Returns a function that stops
 * the animation where it is; `onDone` runs only if it finishes.
 *
 * Scramble characters are often wider than the letters they stand in for, so
 * while it runs the text doesn't wrap by itself: it breaks only at `breaks`
 * (the final text's line starts, see `lineStarts`) and any extra width runs
 * off to the side. Normal wrapping comes back when it finishes.
 */
export function runScramble(
  el: HTMLElement,
  from: string,
  to: string,
  pool: string,
  options: ScrambleOptions,
  breaks: Set<number> = new Set(),
  onDone?: () => void
): () => void {
  const chars = [...pool];
  const rand = () => chars[(Math.random() * chars.length) | 0];
  const source = [...from];
  const target = [...to];

  const noise = Array.from(
    { length: Math.max(source.length, target.length) },
    rand
  );
  // When each target letter settles (0–1 of progress): mostly left to right.
  const settleAt = target.map((_, i) =>
    Math.min(
      0.999,
      (i / target.length) * (1 - options.randomness) +
        options.randomness * Math.random()
    )
  );

  el.style.whiteSpace = "pre";
  const start = performance.now();
  let frame = requestAnimationFrame(function tick(now) {
    const p = easeInOut(Math.min(1, (now - start) / options.duration));
    if (p >= 1) {
      el.textContent = to;
      el.style.whiteSpace = "";
      onDone?.();
      return;
    }
    for (let i = 0; i < noise.length; i++) {
      if (Math.random() < options.flicker) noise[i] = rand();
    }
    const length = Math.round(
      source.length + (target.length - source.length) * p
    );
    let text = "";
    for (let i = 0; i < length; i++) {
      if (breaks.has(i)) text = text.replace(/[ \u00a0]$/, "") + "\n";
      const c = target[i];
      text +=
        c !== undefined && (isSpace(c) || p >= settleAt[i]) ? c : noise[i];
    }
    el.textContent = text;
    frame = requestAnimationFrame(tick);
  });

  return () => cancelAnimationFrame(frame);
}

/**
 * Dev-only: warn about pool characters the element's font doesn't have (they
 * would render in a fallback font). If the font has a character, its width is
 * the same whichever generic family follows it; if not, the fallbacks show
 * through and the widths differ.
 */
export async function warnMissingGlyphs(el: HTMLElement, pool: string) {
  await document.fonts.ready;
  const style = getComputedStyle(el);
  const family = style.fontFamily.split(",")[0].trim();
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx || !family) return;

  const size = "40px";
  const width = (font: string, c: string) => {
    ctx.font = `${size} ${font}`;
    return ctx.measureText(c).width;
  };
  const missing = [...new Set(pool)].filter(
    c =>
      new Set(
        ["monospace", "serif", "sans-serif"].map(generic =>
          width(`${family}, ${generic}`, c)
        )
      ).size > 1
  );

  if (missing.length) {
    // Dev-only by design (the caller gates on import.meta.env.DEV).
    // eslint-disable-next-line no-console
    console.warn(
      // Astro's font API names families "Inter-<hash>"; show the plain name.
      `[scramble] ${missing.length} character(s) not in ${family.replace(/-[0-9a-f]{8,}$/, "")}: ${missing.join(" ")}\n` +
        "They'll render in a fallback font. Pick another pool or drop them.",
      el
    );
  }
}
