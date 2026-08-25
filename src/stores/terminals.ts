import { create } from "zustand";
import { homeDir } from "@/lib/api";

export interface TermSession {
  id: string;
  title: string;
  /** pty id — equals session id */
  pid: string;
  cwd?: string;
  program?: string;
  args?: string[];
}

interface TerminalState {
  sessions: TermSession[];
  activeId: string | null;
  createSession: (opts?: {
    title?: string;
    cwd?: string;
    program?: string;
    args?: string[];
  }) => Promise<TermSession>;
  closeSession: (id: string) => void;
  setActive: (id: string) => void;
  renameSession: (id: string, title: string) => void;
}

export const useTerminalStore = create<TerminalState>()((set, get) => ({
  sessions: [],
  activeId: null,

  createSession: async (opts) => {
    let cwd = opts?.cwd;
    if (!cwd && !opts?.program) {
      try {
        cwd = await homeDir();
      } catch {
        cwd = undefined;
      }
    }
    const id = crypto.randomUUID();
    const n = get().sessions.length + 1;
    const session: TermSession = {
      id,
      pid: id,
      title: opts?.title ?? `Terminal ${n}`,
      cwd,
      program: opts?.program,
      args: opts?.args,
    };
    set((s) => ({ sessions: [...s.sessions, session], activeId: id }));
    return session;
  },

  closeSession: (id) =>
    set((s) => {
      const sessions = s.sessions.filter((x) => x.id !== id);
      return {
        sessions,
        activeId:
          s.activeId === id ? (sessions[sessions.length - 1]?.id ?? null) : s.activeId,
      };
    }),

  setActive: (id) => set({ activeId: id }),

  renameSession: (id, title) =>
    set((s) => ({
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, title } : x)),
    })),
}));
