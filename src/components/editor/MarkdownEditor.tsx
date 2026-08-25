import { useEffect, useRef } from "react";
import {
  EditorState,
  type Extension,
} from "@codemirror/state";
import { EditorView, keymap, highlightSpecialChars } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { useTuiTheme } from "@/themes/ThemeContext";
import { readFile, writeFile } from "@/lib/api";
import { buildLivePreview, editorBaseTheme } from "@/components/editor/livePreview";
import { editorRegistry } from "@/components/editor/registry";
import { useNoteContentStore } from "@/stores/noteContent";
import { hexToCssRgb } from "@/lib/color";

interface MarkdownEditorProps {
  path: string;
  onOpenNote: (path: string, name: string) => void;
}

/** Find a [[wikilink]] around pos; returns the target or null. */
function wikilinkAt(docText: string, pos: number): string | null {
  let start = -1;
  for (let i = Math.min(pos, docText.length) - 1; i >= 0; i--) {
    const two = docText.slice(i, i + 2);
    if (two === "[[") {
      start = i + 2;
      break;
    }
    if (two[1] === "\n") break;
  }
  if (start < 0 || start > docText.length - 2) return null;
  const close = docText.indexOf("]]", start);
  if (close < 0 || pos > close + 1) return null;
  const inner = docText.slice(start, close);
  return inner.split(/[|#]/)[0].trim() || null;
}

export default function MarkdownEditor({ path, onOpenNote }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimer = useRef<number | null>(null);
  const onOpenNoteRef = useRef(onOpenNote);
  onOpenNoteRef.current = onOpenNote;

  const { theme } = useTuiTheme();
  const ui = theme.ui;

  // Theme CSS variables
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty("--ed-fg", ui.text);
    el.style.setProperty("--ed-accent", ui.accent);
    el.style.setProperty("--ed-muted", hexToCssRgb(ui.text, 0.35));
    el.style.setProperty("--ed-selection", hexToCssRgb(ui.accent, 0.25));
    el.style.setProperty("--ed-code-bg", "rgba(128,128,128,0.12)");
  }, [ui]);

  // Create / destroy the editor per file.
  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    let cancelled = false;
    let view: EditorView | null = null;

    readFile(path).then((content) => {
      if (cancelled) return;

      const scheduleSave = (text: string) => {
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
          void writeFile(path, text);
          useNoteContentStore.getState().publish(path, text);
        }, 400);
      };

      const wikilinkHandler = EditorView.domEventHandlers({
        mousedown(event, v) {
          const pos = v.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos == null) return false;
          const target = wikilinkAt(v.state.doc.toString(), pos);
          if (!target) return false;
          event.preventDefault();
          onOpenNoteRef.current(target, target.endsWith(".md") ? target.replace(/\.md$/, "") : target);
          return true;
        },
      });

      const extensions: Extension[] = [
        highlightSpecialChars(),
        history(),
        EditorView.lineWrapping,
        buildLivePreview(),
        editorBaseTheme,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        wikilinkHandler,
        keymap.of([
          {
            key: "Mod-s",
            preventDefault: true,
            run: (v) => {
              void writeFile(path, v.state.doc.toString());
              useNoteContentStore.getState().publish(path, v.state.doc.toString());
              return true;
            },
          },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) scheduleSave(u.state.doc.toString());
        }),
      ];

      view = new EditorView({
        state: EditorState.create({ doc: content, extensions }),
        parent: host,
      });
      viewRef.current = view;
      editorRegistry.set(path, view);
    });

    return () => {
      cancelled = true;
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        // flush pending save
        const v = viewRef.current;
        if (v) void writeFile(path, v.state.doc.toString());
      }
      editorRegistry.delete(path);
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return (
    <div
      className="h-full min-h-0 w-full overflow-y-auto"
      style={{ background: ui.background }}
    >
      <div ref={containerRef} className="min-h-full [&_.cm-editor]:outline-none" />
    </div>
  );
}
