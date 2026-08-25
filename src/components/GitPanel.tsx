import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  CornerDownLeft,
  FileText,
  GitBranch,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import {
  gitBranch as fetchBranch,
  gitCommit,
  gitInit,
  gitIsRepo,
  gitPull,
  gitPush,
  gitStage,
  gitStatus,
  gitUnstage,
  type GitFile,
} from "@/lib/api";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";

interface GitPanelProps {
  vaultPath: string;
}

const STATUS_LABELS: Record<string, string> = {
  M: "modified",
  A: "added",
  D: "deleted",
  R: "renamed",
  C: "copied",
  U: "unmerged",
  "?": "untracked",
};

export default function GitPanel({ vaultPath }: GitPanelProps) {
  const { theme } = useTuiTheme();
  const ui = theme.ui;

  const [isRepo, setIsRepo] = useState<boolean | null>(null);
  const [branch, setBranch] = useState("");
  const [files, setFiles] = useState<GitFile[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const refresh = useCallback(() => {
    gitIsRepo(vaultPath).then((repo) => {
      setIsRepo(repo);
      if (!repo) return;
      fetchBranch(vaultPath)
        .then((b) => setBranch(b.trim()))
        .catch(() => setBranch(""));
      gitStatus(vaultPath)
        .then(setFiles)
        .catch(() => setFiles([]));
    });
  }, [vaultPath]);

  useEffect(() => {
    setFeedback(null);
    setMessage("");
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [refresh]);

  const runAction = useCallback(
    async (label: string, fn: () => Promise<string>, clearMsg = false) => {
      setBusy(true);
      setFeedback(null);
      try {
        const out = await fn();
        const text =
          out.trim().split("\n").slice(-3).join("\n") || `${label} done`;
        setFeedback({ ok: true, text });
        if (clearMsg) setMessage("");
      } catch (e) {
        setFeedback({ ok: false, text: String(e) });
      } finally {
        setBusy(false);
        refresh();
      }
    },
    [refresh],
  );

  if (isRepo === null) return null;

  if (!isRepo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <GitBranch className="h-6 w-6" style={{ color: ui.muted }} />
        <p className="text-xs" style={{ color: ui.muted }}>
          This vault is not a git repository yet. Initialize one to back up
          your notes on GitHub.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAction("Init", () => gitInit(vaultPath))}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          style={{ background: ui.accentSoft, color: ui.accent }}
        >
          Initialize repository
        </button>
      </div>
    );
  }

  // X = staged (index) status, Y = worktree status in `git status --porcelain`.
  const staged = files.filter((f) => f.x !== " " && f.x !== "?");
  const unstaged = files.filter((f) => f.y !== " " && f.y !== "?");

  const badgeColor = (code: string) => {
    if (code === "D") return "#f16063";
    if (code === "A" || code === "?") return "#4fb572";
    return "#e0a030";
  };

  const renderFileRow = (
    f: GitFile,
    isStaged: boolean,
    code: string,
  ) => (
    <button
      key={`${f.path}:${isStaged}`}
      type="button"
      title={
        isStaged
          ? `Click to unstage (${STATUS_LABELS[code] ?? code})`
          : `Click to stage (${STATUS_LABELS[code] ?? code})`
      }
      disabled={busy}
      onClick={() =>
        void runAction(isStaged ? "Unstage" : "Stage", () =>
          isStaged ? gitUnstage(vaultPath, f.path) : gitStage(vaultPath, f.path),
        )
      }
      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors duration-150 disabled:opacity-60"
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = hexToCssRgb(ui.text, 0.08))
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: ui.muted }} />
      <span className="truncate text-[12px]" style={{ color: ui.text }}>
        {f.path}
      </span>
      <span
        className="ml-auto shrink-0 rounded px-1 font-mono text-[10px] font-bold"
        style={{
          background: hexToCssRgb(badgeColor(code), 0.15),
          color: badgeColor(code),
        }}
      >
        {code}
      </span>
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex shrink-0 items-center gap-1 border-b px-3 py-2"
        style={{ borderColor: hexToCssRgb(ui.text, 0.08) }}
      >
        <span
          className="flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ background: ui.accentSoft, color: ui.accent }}
        >
          <GitBranch className="h-3 w-3 shrink-0" />
          <span className="truncate">{branch || "HEAD"}</span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            title="Pull"
            disabled={busy}
            onClick={() => void runAction("Pull", () => gitPull(vaultPath))}
            className="flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-white/10 disabled:opacity-40"
            style={{ color: ui.text }}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Push"
            disabled={busy}
            onClick={() => void runAction("Push", () => gitPush(vaultPath))}
            className="flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-white/10 disabled:opacity-40"
            style={{ color: ui.text }}
          >
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Refresh"
            disabled={busy}
            onClick={refresh}
            className="flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-white/10 disabled:opacity-40"
            style={{ color: ui.text }}
          >
            <RefreshCw
              className={"h-3.5 w-3.5" + (busy ? " animate-spin" : "")}
            />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {files.length === 0 && (
          <p className="py-4 text-center text-xs" style={{ color: ui.muted }}>
            Working tree clean ✓
          </p>
        )}

        {staged.length > 0 && (
          <>
            <p
              className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "#4fb572" }}
            >
              Staged ({staged.length})
            </p>
            {staged.map((f) =>
              renderFileRow(f, true, f.x === "?" ? f.y : f.x),
            )}
          </>
        )}

        {unstaged.length > 0 && (
          <>
            <p
              className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "#e0a030" }}
            >
              Changes ({unstaged.length})
            </p>
            {unstaged.map((f) => renderFileRow(f, false, f.y))}
          </>
        )}
      </div>

      <div
        className="shrink-0 border-t px-3 py-3"
        style={{ borderColor: hexToCssRgb(ui.text, 0.08) }}
      >
        {feedback && (
          <p
            className="mb-2 max-h-16 overflow-y-auto whitespace-pre-wrap break-words rounded-md px-2 py-1 text-[11px]"
            style={{
              background: hexToCssRgb(feedback.ok ? "#4fb572" : "#f16063", 0.12),
              color: feedback.ok ? "#4fb572" : "#f16063",
            }}
          >
            {feedback.text}
          </p>
        )}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (message.trim() && staged.length > 0 && !busy)
                void runAction(
                  "Commit",
                  () => gitCommit(vaultPath, message),
                  true,
                );
            }
          }}
          placeholder="Commit message… (Ctrl+Enter to commit)"
          rows={2}
          className="w-full resize-none rounded-lg border px-2.5 py-2 text-[12px] outline-none transition placeholder:opacity-50"
          style={{
            borderColor: hexToCssRgb(ui.text, 0.12),
            background: hexToCssRgb(ui.text, 0.05),
            color: ui.text,
          }}
        />
        <button
          type="button"
          disabled={!message.trim() || staged.length === 0 || busy}
          onClick={() =>
            void runAction("Commit", () => gitCommit(vaultPath, message), true)
          }
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: ui.accentSoft, color: ui.accent }}
        >
          {busy ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : message.trim() && staged.length > 0 ? (
            <CornerDownLeft className="h-3.5 w-3.5" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Commit{staged.length > 0 ? ` (${staged.length})` : ""}
        </button>
      </div>
    </div>
  );
}
