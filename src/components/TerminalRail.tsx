import { Plus, SquareTerminal, X } from "lucide-react";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";
import {
  useTerminalStore,
  type TermSession,
} from "@/stores/terminals";

interface RailItemProps {
  session: TermSession;
  active: boolean;
}

function RailItem({ session, active }: RailItemProps) {
  const { theme } = useTuiTheme();
  const ui = theme.ui;
  const setActive = useTerminalStore((s) => s.setActive);
  const closeSession = useTerminalStore((s) => s.closeSession);

  return (
    <div className="group relative">
      <button
        type="button"
        title={session.title}
        onClick={() => setActive(session.id)}
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        style={{
          background: active ? ui.accentSoft : "transparent",
          color: active ? ui.accent : ui.muted,
        }}
      >
        <SquareTerminal className="h-4 w-4" />
      </button>
      <button
        type="button"
        title={`Close ${session.title}`}
        onClick={(e) => {
          e.stopPropagation();
          closeSession(session.id);
        }}
        className="absolute -right-0.5 -top-0.5 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500/80 text-white group-hover:flex"
      >
        <X className="h-2 w-2" strokeWidth={3} />
      </button>
      {active && (
        <span
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
          style={{ background: ui.accent }}
        />
      )}
    </div>
  );
}

export default function TerminalRail({
  onTogglePanel,
  panelOpen,
}: {
  onTogglePanel: () => void;
  panelOpen: boolean;
}) {
  const { theme } = useTuiTheme();
  const ui = theme.ui;
  const sessions = useTerminalStore((s) => s.sessions);
  const activeId = useTerminalStore((s) => s.activeId);
  const createSession = useTerminalStore((s) => s.createSession);

  return (
    <aside
      className="flex h-full min-h-0 shrink-0 flex-col items-center gap-1 border-l px-1 py-2"
      style={{
        width: 36,
        borderColor: hexToCssRgb(ui.text, 0.1),
        background: hexToCssRgb(ui.background, 1),
      }}
    >
      <div className="flex flex-col items-center gap-1 overflow-y-auto">
        {sessions.map((s) => (
          <RailItem key={s.id} session={s} active={s.id === activeId} />
        ))}
      </div>
      <div className="mt-auto flex flex-col items-center gap-1 pt-2">
        <button
          type="button"
          title="New terminal session"
          onClick={() => void createSession()}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
          style={{ color: ui.muted }}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={panelOpen ? "Hide terminal panel" : "Show terminal panel"}
          onClick={onTogglePanel}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{
            color: panelOpen ? ui.accent : ui.muted,
            background: panelOpen ? ui.accentSoft : "transparent",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M15 4v16" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
