import { useCallback, useEffect, useState } from "react";
import { ArrowUpToLine, Check, Folder, LoaderCircle } from "lucide-react";
import { homeDir, listDir, type DirEntry } from "@/lib/api";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";

interface FolderPickerProps {
  onSelect: (path: string) => void;
  onClose: () => void;
}

export default function FolderPicker({ onSelect, onClose }: FolderPickerProps) {
  const { theme } = useTuiTheme();
  const ui = theme.ui;

  const [cwd, setCwd] = useState<string>("");
  const [dirs, setDirs] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    homeDir()
      .then(setCwd)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!cwd) return;
    setLoading(true);
    setError("");
    listDir(cwd)
      .then((entries) => setDirs(entries.filter((e) => e.is_dir)))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [cwd]);

  const goUp = useCallback(() => {
    setCwd((c) => {
      const idx = c.lastIndexOf("/");
      return idx > 0 ? c.slice(0, idx) : "/";
    });
  }, []);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: hexToCssRgb(ui.background, 0.7), backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[480px] w-full max-w-[440px] flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ borderColor: hexToCssRgb(ui.text, 0.15), background: ui.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: hexToCssRgb(ui.text, 0.1) }}
        >
          <span className="text-sm font-semibold" style={{ color: ui.text }}>
            Choose a vault folder
          </span>
        </div>

        <div
          className="flex items-center gap-2 border-b px-4 py-2 text-xs"
          style={{
            borderColor: hexToCssRgb(ui.text, 0.1),
            color: ui.muted,
            background: hexToCssRgb(ui.text, 0.04),
          }}
        >
          <button
            type="button"
            onClick={goUp}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition hover:bg-white/10"
            style={{ color: ui.text }}
            title="Parent folder"
          >
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </button>
          <span className="truncate font-mono">{cwd || "…"}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {loading && (
            <div className="flex justify-center py-6">
              <LoaderCircle className="h-5 w-5 animate-spin" style={{ color: ui.accent }} />
            </div>
          )}
          {!loading && dirs.length === 0 && (
            <p className="py-6 text-center text-xs" style={{ color: ui.muted }}>
              No subfolders here.
            </p>
          )}
          {dirs.map((d) => (
            <button
              key={d.path}
              type="button"
              onClick={() => setCwd(d.path)}
              onDoubleClick={() => onSelect(d.path)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition"
              style={{ color: ui.text }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = hexToCssRgb(ui.text, 0.08))
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Folder className="h-4 w-4 shrink-0" style={{ color: ui.accent }} />
              <span className="truncate">{d.name}</span>
            </button>
          ))}
          {error && (
            <p className="px-3 py-2 text-xs" style={{ color: "#f16063" }}>
              {error}
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-between border-t px-4 py-3"
          style={{ borderColor: hexToCssRgb(ui.text, 0.1) }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
            style={{ color: ui.muted, background: hexToCssRgb(ui.text, 0.08) }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!cwd}
            onClick={() => onSelect(cwd)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40"
            style={{ background: ui.accentSoft, color: ui.accent }}
          >
            <Check className="h-3.5 w-3.5" />
            Use this folder
          </button>
        </div>
      </div>
    </div>
  );
}
