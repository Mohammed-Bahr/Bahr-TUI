import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import { isMarkdown, listDir, type DirEntry } from "@/lib/api";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";

interface FileTreeProps {
  root: string;
  selectedPath: string | null;
  onOpenFile: (entry: DirEntry) => void;
}

const CODE_EXTS = new Set([
  "js","jsx","ts","tsx","c","h","cpp","hpp","cc","rs","go","py","rb","java",
  "kt","swift","sh","bash","zsh","fish","lua","php","html","css","scss","json",
  "yaml","yml","toml","xml","sql","r","m","pl","hs","vim","dart","vue","svelte",
]);

function fileIcon(name: string, color: string, muted: string) {
  const i = name.lastIndexOf(".");
  const ext = i >= 0 ? name.slice(i + 1).toLowerCase() : "";
  if (isMarkdown(name))
    return <FileText className="h-4 w-4 shrink-0" style={{ color }} />;
  if (CODE_EXTS.has(ext))
    return <FileCode className="h-4 w-4 shrink-0" style={{ color: muted }} />;
  return <FileText className="h-4 w-4 shrink-0" style={{ color: muted }} />;
}

function TreeNode({
  entry,
  depth,
  selectedPath,
  expanded,
  toggleDir,
  onOpenFile,
}: {
  entry: DirEntry;
  depth: number;
  selectedPath: string | null;
  expanded: Set<string>;
  toggleDir: (path: string) => void;
  onOpenFile: (entry: DirEntry) => void;
}) {
  const { theme } = useTuiTheme();
  const ui = theme.ui;
  const isSelected = selectedPath === entry.path;

  const rowStyle = (hovered: boolean) => ({
    paddingLeft: 8 + depth * 14,
    background:
      isSelected || hovered ? hexToCssRgb(ui.text, 0.08) : "transparent",
    color: isSelected ? ui.accent : ui.text,
  });

  if (entry.is_dir) {
    const isOpen = expanded.has(entry.path);
    return (
      <>
        <button
          type="button"
          onClick={() => toggleDir(entry.path)}
          className="flex w-full items-center gap-1 rounded-md py-1 pr-2 text-left text-[13px] transition-colors duration-150"
          style={rowStyle(false)}
          onMouseEnter={(e) =>
            Object.assign(e.currentTarget.style, rowStyle(true))
          }
          onMouseLeave={(e) =>
            Object.assign(e.currentTarget.style, rowStyle(false))
          }
        >
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
          )}
          {isOpen ? (
            <FolderOpen className="h-4 w-4 shrink-0" style={{ color: ui.accent2 }} />
          ) : (
            <Folder className="h-4 w-4 shrink-0" style={{ color: ui.accent2 }} />
          )}
          <span className="truncate font-medium">{entry.name}</span>
        </button>
        {isOpen && (
          <DirChildren path={entry.path} depth={depth + 1} {...{ selectedPath, expanded, toggleDir, onOpenFile }} />
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenFile(entry)}
      className="flex w-full items-center gap-1 rounded-md py-1 pl-7 pr-2 text-left text-[13px] transition-colors duration-150"
      style={{ ...rowStyle(false), paddingLeft: 8 + depth * 14 + 18 }}
      onMouseEnter={(e) => Object.assign(e.currentTarget.style, rowStyle(true))}
      onMouseLeave={(e) => Object.assign(e.currentTarget.style, rowStyle(false))}
    >
      {fileIcon(entry.name, ui.accent, ui.muted)}
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

function DirChildren({
  path,
  depth,
  selectedPath,
  expanded,
  toggleDir,
  onOpenFile,
}: {
  path: string;
  depth: number;
  selectedPath: string | null;
  expanded: Set<string>;
  toggleDir: (path: string) => void;
  onOpenFile: (entry: DirEntry) => void;
}) {
  const [children, setChildren] = useState<DirEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listDir(path)
      .then((entries) => !cancelled && setChildren(entries))
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (error)
    return (
      <p className="truncate py-1 text-xs italic" style={{ paddingLeft: 24 + depth * 14, color: "#f16063" }}>
        {error}
      </p>
    );
  if (!children)
    return null;

  return (
    <>
      {children.map((child) => (
        <TreeNode
          key={child.path}
          entry={child}
          depth={depth}
          selectedPath={selectedPath}
          expanded={expanded}
          toggleDir={toggleDir}
          onOpenFile={onOpenFile}
        />
      ))}
    </>
  );
}

export default function FileTree({ root, selectedPath, onOpenFile }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([root]));

  const toggleDir = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return (
    <DirChildren
      path={root}
      depth={0}
      selectedPath={selectedPath}
      expanded={expanded}
      toggleDir={toggleDir}
      onOpenFile={onOpenFile}
    />
  );
}
