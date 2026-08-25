import { useEffect, useMemo, useState } from "react";
import { CornerDownRight, Hash } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useNoteContentStore } from "@/stores/noteContent";
import { backlinksFor, useVaultIndexStore } from "@/stores/vaultIndex";
import { extractHeadings } from "@/lib/markdown";
import { revealLine } from "@/components/editor/registry";
import { readFile, isMarkdown } from "@/lib/api";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";

function useActiveNote(): string | null {
  const panes = useWorkspaceStore((s) => s.panes);
  const activePaneId = useWorkspaceStore((s) => s.activePaneId);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const pane = panes.find((p) => p.id === activePaneId) ?? panes[0];
  if (!pane?.activeTabId) return null;
  const tab = tabs[pane.activeTabId];
  return tab?.kind === "note" ? tab.key.slice("note:".length) : null;
}

export default function OutlinePanel() {
  const { theme } = useTuiTheme();
  const ui = theme.ui;
  const path = useActiveNote();
  const liveContent = useNoteContentStore((s) =>
    path ? (s.contents[path] ?? null) : null,
  );
  const [fileContent, setFileContent] = useState<string | null>(null);

  useEffect(() => {
    setFileContent(null);
    if (!path || !isMarkdown(path)) return;
    readFile(path)
      .then(setFileContent)
      .catch(() => setFileContent(null));
  }, [path]);

  const content = liveContent ?? fileContent;
  const headings = useMemo(
    () => (path && content ? extractHeadings(content) : []),
    [content, path],
  );

  const notes = useVaultIndexStore((s) => s.notes);
  const links = useVaultIndexStore((s) => s.links);
  const backlinks = useMemo(
    () => (path ? backlinksFor({ links }, path) : []),
    [links, path],
  );

  const nameFor = (p: string) =>
    notes.find((n) => n.path === p)?.base ?? p.split("/").pop() ?? p;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-2 py-2">
      <span
        className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider"
        style={{ color: ui.muted }}
      >
        Outline
      </span>
      {!path && (
        <p className="px-1 py-2 text-xs" style={{ color: ui.muted }}>
          Open a note to see its outline.
        </p>
      )}
      {path && headings.length === 0 && (
        <p className="px-1 py-2 text-xs italic" style={{ color: ui.muted }}>
          No headers in this note yet.
        </p>
      )}
      {headings.map((h, i) => (
        <button
          key={`${h.line}-${i}`}
          type="button"
          onClick={() => path && revealLine(path, h.line)}
          className="flex items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[12.5px] transition-colors hover:bg-white/5"
          style={{
            paddingLeft: 6 + (h.level - 1) * 12,
            color: h.level <= 2 ? ui.text : ui.muted,
            fontWeight: h.level <= 2 ? 600 : 400,
          }}
        >
          <Hash className="h-3 w-3 shrink-0 opacity-50" style={{ color: ui.accent }} />
          <span className="truncate">{h.text}</span>
        </button>
      ))}

      <span
        className="mt-4 px-1 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider"
        style={{ color: ui.muted }}
      >
        Backlinks
      </span>
      {!path && backlinks.length === 0 && null}
      {backlinks.length === 0 && (
        <p className="px-1 py-2 text-xs italic" style={{ color: ui.muted }}>
          No notes link here.
        </p>
      )}
      {backlinks.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() =>
            useWorkspaceStore.getState().openNote(p, nameFor(p))
          }
          className="flex items-center gap-1.5 rounded-md px-1 py-1 text-left text-[12.5px] transition-colors hover:bg-white/5"
          style={{
            color: ui.text,
            borderBottom: `1px solid ${hexToCssRgb(ui.text, 0.05)}`,
          }}
        >
          <CornerDownRight className="h-3 w-3 shrink-0" style={{ color: ui.accent2 }} />
          <span className="truncate">{nameFor(p)}</span>
        </button>
      ))}
    </div>
  );
}
