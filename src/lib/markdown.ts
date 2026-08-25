export interface Heading {
  level: number;
  text: string;
  line: number;
}

export interface NoteLink {
  /** raw target as written */
  target: string;
  line: number;
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;

/** Extract headings for the outline panel. */
export function extractHeadings(src: string): Heading[] {
  const out: Heading[] = [];
  let inFence = false;
  src.split("\n").forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const m = line.match(HEADING_RE);
    if (m) out.push({ level: m[1].length, text: m[2].trim(), line: i });
  });
  return out;
}

/**
 * Extract links from a note: [[wikilinks]] (optionally [[name|alias]] or
 * [[name#heading]]) and standard [text](target.md) markdown links.
 * Returns targets normalized to note basenames (without extension for wikilinks).
 */
export function extractLinks(src: string): NoteLink[] {
  const out: NoteLink[] = [];
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) return;
    // strip inline code so backticks with brackets don't count
    const clean = line.replace(/`[^`]*`/g, "");
    const wiki = clean.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g);
    for (const m of wiki) out.push({ target: m[1].trim(), line: i });
    const md = clean.matchAll(/\[[^\]]*\]\(([^)\s]+\.md)\)/g);
    for (const m of md)
      out.push({ target: m[1].split("/").pop()!.replace(/\.md$/i, ""), line: i });
  });
  return out;
}
