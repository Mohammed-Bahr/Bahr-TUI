import { type ReactNode, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { readFile } from "@/lib/api";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";

export interface PreviewTarget {
  name: string;
  path: string;
}

interface MarkdownPreviewProps {
  target: PreviewTarget;
  onClose: () => void;
}

const INLINE_RE =
  /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|__[^_\n]+__|_[^_\n]+_|`[^`\n]+`|~~[^~\n]+~~|\[[^\]\n]*\]\([^)\n]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_RE);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4)
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4)
      return <del key={key}>{part.slice(2, -2)}</del>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return (
        <code
          key={key}
          className="rounded px-1 py-0.5 font-mono text-[0.9em]"
          style={{ background: "rgba(128,128,128,0.18)" }}
        >
          {part.slice(1, -1)}
        </code>
      );
    const linkMatch = part.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
    if (linkMatch)
      return (
        <a
          key={key}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: "underline" }}
        >
          {linkMatch[1] || linkMatch[2]}
        </a>
      );
    if (
      (part.startsWith("*") && part.endsWith("*") && part.length > 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length > 2)
    )
      return <em key={key}>{renderInline(part.slice(1, -1), key)}</em>;
    return <span key={key}>{part}</span>;
  });
}

function renderMarkdown(src: string): ReactNode[] {
  const lines = src.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const push = (node: ReactNode) => {
    out.push(<div key={`b-${key++}`}>{node}</div>);
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++;
      push(
        <pre
          className="overflow-x-auto rounded-lg p-3 text-[12px] leading-relaxed"
          style={{ background: "rgba(128,128,128,0.12)" }}
        >
          <code className="font-mono">{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const sizes = ["1.5em", "1.3em", "1.15em", "1.05em", "0.95em", "0.9em"];
      push(
        <p
          className="font-bold leading-snug"
          style={{
            fontSize: sizes[level - 1],
            marginTop: level <= 2 ? "0.6em" : "0.35em",
          }}
        >
          {renderInline(heading[2], `h${i}`)}
        </p>,
      );
      i++;
      continue;
    }

    if (/^\s*([-*_])\s*\1\s*\1[\s*_-]*$/.test(line)) {
      push(
        <hr className="my-2 border-0" style={{ borderTop: "1px solid rgba(128,128,128,0.25)" }} />,
      );
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      push(
        <blockquote
          className="pl-3"
          style={{ borderLeft: `3px solid rgba(128,128,128,0.35)` }}
        >
          {quote.map((q, qi) => (
            <p key={qi} className="italic opacity-90">
              {renderInline(q, `q${qi}`)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const ordered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (bullet || ordered) {
      const isOrdered = !!ordered;
      const items: string[] = [];
      while (i < lines.length) {
        const b = lines[i].match(/^\s*[-*+]\s+(.*)$/);
        const o = lines[i].match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (isOrdered && o) items.push(o[2]);
        else if (!isOrdered && b) items.push(b[1]);
        else break;
        i++;
      }
      const rendered = items.map((item, ii) => (
        <li key={ii} className="leading-relaxed">
          {renderInline(item, `li${ii}`)}
        </li>
      ));
      push(isOrdered ? <ol className="list-decimal pl-6">{rendered}</ol> : <ul className="list-disc pl-6">{rendered}</ul>);
      continue;
    }

    // paragraph
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^\s*>/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    push(
      <p className="leading-relaxed">
        {para.map((p, pi) => (
          <span key={pi}>
            {pi > 0 && <br />}
            {renderInline(p, `p${pi}`)}
          </span>
        ))}
      </p>,
    );
  }

  return out;
}

export default function MarkdownPreview({ target, onClose }: MarkdownPreviewProps) {
  const { theme } = useTuiTheme();
  const ui = theme.ui;
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setContent(null);
    setError("");
    readFile(target.path)
      .then(setContent)
      .catch((e) => setError(String(e)));
  }, [target.path]);

  const blocks = useMemo(() => (content ? renderMarkdown(content) : null), [content]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex shrink-0 items-center gap-2 border-b px-4 py-2"
        style={{ borderColor: hexToCssRgb(ui.text, 0.08) }}
      >
        <span className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: ui.text }}>
          {target.name}
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Close preview"
          className="flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-white/10"
          style={{ color: ui.muted }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <div
          className="mx-auto max-w-[720px] text-[14px]"
          style={{ color: ui.text }}
        >
          {error && <p style={{ color: "#f16063" }}>{error}</p>}
          {!error && blocks === null && (
            <p style={{ color: ui.muted }}>Loading…</p>
          )}
          <div className="flex flex-col gap-2">{blocks}</div>
        </div>
      </div>
    </div>
  );
}
