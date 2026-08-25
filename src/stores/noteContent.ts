import { create } from "zustand";

interface NoteContentState {
  /** path -> latest content (updated by editors on save) */
  contents: Record<string, string>;
  publish: (path: string, content: string) => void;
}

export const useNoteContentStore = create<NoteContentState>()((set) => ({
  contents: {},
  publish: (path, content) =>
    set((s) => ({ contents: { ...s.contents, [path]: content } })),
}));

export function useNoteContent(path: string | null): string | null {
  return useNoteContentStore((s) => (path ? (s.contents[path] ?? null) : null));
}
