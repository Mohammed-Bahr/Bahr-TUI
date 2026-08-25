import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  WidgetType,
  type ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder, type Extension } from "@codemirror/state";

const HIDDEN = Decoration.replace({});

class BulletWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = "\u2022";
    span.className = "cm-bullet";
    return span;
  }
  override ignoreEvent() {
    return false;
  }
}

const BULLET = Decoration.replace({ widget: new BulletWidget(), inclusive: false });

interface DecoRange {
  from: number;
  to: number;
  deco: Decoration;
  line?: boolean;
}

/** Inline markdown tokens (bold, italic, code, strike, wikilinks, md links). */
const TOKEN_RE =
  /(\*\*|__)([^*_\n]+?)\1|(\*|_)([^*_\n]+?)\3|`([^`\n]+)`|~~([^~\n]+)~~|\[\[([^\]\n|#]+)(?:[|#][^\]\n]*)?\]\]|\[([^\]\n]*)\]\(([^()\n]+)\)/g;

function selectionOverlaps(view: EditorView, from: number, to: number): boolean {
  const pad = 3;
  for (const r of view.state.selection.ranges) {
    if (r.from <= to + pad && r.to >= from - pad) return true;
  }
  return false;
}

export function buildLivePreview(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(u: ViewUpdate) {
        if (u.docChanged || u.selectionSet || u.viewportChanged || u.focusChanged) {
          this.decorations = buildDecorations(u.view);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}

function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const doc = state.doc;

  // Precompute fenced-code state for every line number.
  const inFence: boolean[] = new Array(doc.lines + 1).fill(false);
  let fenceOpen = false;
  for (let n = 1; n <= doc.lines; n++) {
    inFence[n] = fenceOpen;
    if (/^\s*(```|~~~)/.test(doc.line(n).text)) fenceOpen = !fenceOpen;
  }

  const out: DecoRange[] = [];

  for (const { from, to } of view.visibleRanges) {
    const firstLine = doc.lineAt(from).number;
    const lastLine = doc.lineAt(to).number;

    for (let n = firstLine; n <= lastLine; n++) {
      const line = doc.line(n);
      const t = line.text;
      const active = selectionOverlaps(view, line.from, line.to);

      // Fenced code blocks
      if (/^\s*(```|~~~)/.test(t)) {
        out.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({ class: "cm-codeblock" }),
        });
        continue;
      }
      if (inFence[n]) {
        out.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({ class: "cm-codeblock cm-codeblock-inner" }),
        });
        continue;
      }

      // Headings
      const h = t.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        out.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({ class: `cm-heading cm-h${h[1].length}` }),
        });
        if (!active) {
          out.push({ from: line.from, to: line.from + h[1].length + 1, deco: HIDDEN });
        }
        continue;
      }

      // Blockquote lines
      if (/^\s*>/.test(t)) {
        out.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({ class: "cm-quote" }),
        });
      }

      // List markers -> bullets when inactive
      if (!active) {
        const li = t.match(/^(\s*)([-*+]|\d+[.)])(\s+)/);
        if (li) {
          out.push({
            from: line.from + li[1].length,
            to: line.from + li[1].length + li[2].length,
            deco: BULLET,
          });
        }
      }

      // Inline tokens
      TOKEN_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = TOKEN_RE.exec(t))) {
        const abs = (i: number) => line.from + i;
        const idx = m.index;
        const end = idx + m[0].length;
        if (active || selectionOverlaps(view, abs(idx), abs(end))) continue;

        if (m[1]) {
          // bold
          out.push({ from: abs(idx), to: abs(idx + m[1].length), deco: HIDDEN });
          out.push({
            from: abs(end - m[1].length),
            to: abs(end),
            deco: HIDDEN,
          });
          out.push({
            from: abs(idx + m[1].length),
            to: abs(end - m[1].length),
            deco: Decoration.mark({ class: "cm-strong" }),
          });
        } else if (m[3]) {
          // italic
          out.push({ from: abs(idx), to: abs(idx + 1), deco: HIDDEN });
          out.push({ from: abs(end - 1), to: abs(end), deco: HIDDEN });
          out.push({
            from: abs(idx + 1),
            to: abs(end - 1),
            deco: Decoration.mark({ class: "cm-em" }),
          });
        } else if (m[5] !== undefined) {
          // inline code
          out.push({ from: abs(idx), to: abs(idx + 1), deco: HIDDEN });
          out.push({ from: abs(end - 1), to: abs(end), deco: HIDDEN });
          out.push({
            from: abs(idx + 1),
            to: abs(end - 1),
            deco: Decoration.mark({ class: "cm-code-inline" }),
          });
        } else if (m[6] !== undefined) {
          // strikethrough
          out.push({ from: abs(idx), to: abs(idx + 2), deco: HIDDEN });
          out.push({ from: abs(end - 2), to: abs(end), deco: HIDDEN });
          out.push({
            from: abs(idx + 2),
            to: abs(end - 2),
            deco: Decoration.mark({ class: "cm-strike" }),
          });
        } else if (m[7] !== undefined) {
          // wikilink [[target]]
          out.push({ from: abs(idx), to: abs(idx + 2), deco: HIDDEN });
          out.push({ from: abs(end - 2), to: abs(end), deco: HIDDEN });
          out.push({
            from: abs(idx + 2),
            to: abs(end - 2),
            deco: Decoration.mark({ class: "cm-wikilink" }),
          });
        } else if (m[9]) {
          // md link [text](url)
          const closeBracket = t.indexOf("](", idx);
          if (closeBracket > 0) {
            out.push({ from: abs(idx), to: abs(idx + 1), deco: HIDDEN });
            out.push({ from: abs(closeBracket), to: abs(end), deco: HIDDEN });
            out.push({
              from: abs(idx + 1),
              to: abs(closeBracket),
              deco: Decoration.mark({ class: "cm-link" }),
            });
          }
        }
      }
    }
  }

  out.sort(
    (a, b) => a.from - b.from || a.to - b.to || (a.line ? -1 : 1) - (b.line ? -1 : 1),
  );

  const builder = new RangeSetBuilder<Decoration>();
  for (const r of out) {
    try {
      builder.add(r.from, r.to, r.deco);
    } catch {
      /* overlapping ranges are skipped */
    }
  }
  return builder.finish();
}

/** Theme wired through CSS variables so it follows the app theme at runtime. */
export const editorBaseTheme: Extension = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--ed-fg)",
    height: "100%",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily:
      '"Inter", system-ui, -apple-system, sans-serif',
    lineHeight: "1.7",
    padding: "24px 0",
  },
  ".cm-content": {
    caretColor: "var(--ed-accent)",
    maxWidth: "760px",
    margin: "0 auto",
    padding: "0 32px",
  },
  ".cm-line": { padding: "0 4px" },
  ".cm-cursor": { borderLeftColor: "var(--ed-accent)" },
  "::selection": { background: "var(--ed-selection)" },
  ".cm-selectionBackground": { background: "var(--ed-selection) !important" },

  ".cm-heading": { fontWeight: "700" },
  ".cm-h1": { fontSize: "1.75em", marginTop: "0.5em" },
  ".cm-h2": { fontSize: "1.45em", marginTop: "0.45em" },
  ".cm-h3": { fontSize: "1.25em", marginTop: "0.4em" },
  ".cm-h4": { fontSize: "1.12em", marginTop: "0.35em" },
  ".cm-h5": { fontSize: "1.02em", marginTop: "0.3em" },
  ".cm-h6": { fontSize: "0.95em", marginTop: "0.3em", opacity: 0.9 },

  ".cm-strong": { fontWeight: "700" },
  ".cm-em": { fontStyle: "italic" },
  ".cm-strike": { textDecoration: "line-through", opacity: 0.75 },
  ".cm-code-inline": {
    background: "var(--ed-code-bg)",
    borderRadius: "4px",
    padding: "1px 4px",
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: "0.88em",
  },
  ".cm-wikilink": {
    color: "var(--ed-accent)",
    cursor: "pointer",
    textDecoration: "none",
  },
  ".cm-link": { color: "var(--ed-accent)", textDecoration: "underline" },
  ".cm-bullet": { color: "var(--ed-accent)" },
  ".cm-quote": {
    borderLeft: "3px solid var(--ed-muted)",
    paddingLeft: "10px !important",
    fontStyle: "italic",
    opacity: 0.85,
  },
  ".cm-codeblock": {
    background: "var(--ed-code-bg)",
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: "0.9em",
  },
});
