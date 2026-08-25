import { create } from "zustand";
import { isMarkdown, listDir, readFile } from "@/lib/api";
import { extractLinks } from "@/lib/markdown";

export interface NoteInfo {
  path: string;
  /** file name without extension */
  base: string;
}

interface VaultIndexState {
  notes: NoteInfo[];
  /** normalized link target (basename) -> source paths */
  links: Map<string, string[]>;
  /** source note path -> normalized link targets it contains */
  outgoing: Map<string, string[]>;
  loading: boolean;
  reindex: (vaultPath: string) => Promise<void>;
}

const MAX_NOTES = 2000;

async function walk(dir: string, acc: string[], depth: number) {
  if (acc.length >= MAX_NOTES || depth > 8) return;
  let entries;
  try {
    entries = await listDir(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (acc.length >= MAX_NOTES) return;
    if (e.is_dir) await walk(e.path, acc, depth + 1);
    else if (isMarkdown(e.name)) acc.push(e.path);
  }
}

function basename(pathOrTarget: string): string {
  const p = pathOrTarget.split("/").pop() ?? pathOrTarget;
  return p.replace(/\.md$/i, "").toLowerCase();
}

export const useVaultIndexStore = create<VaultIndexState>()((set) => ({
  notes: [],
  links: new Map(),
  outgoing: new Map(),
  loading: false,
  reindex: async (vaultPath) => {
    set({ loading: true });
    try {
      const paths: string[] = [];
      await walk(vaultPath, paths, 0);
      // Read contents to build the link graph.
      const links = new Map<string, string[]>();
      const outgoing = new Map<string, string[]>();
      const contents = await Promise.all(
        paths.map(async (p) => {
          try {
            return [p, await readFile(p)] as const;
          } catch {
            return [p, ""] as const;
          }
        }),
      );
      for (const [p, content] of contents) {
        for (const l of extractLinks(content)) {
          const key = basename(l.target);
          const arr = links.get(key);
          if (arr) arr.push(p);
          else links.set(key, [p]);
        }
        outgoing.set(
          p,
          [...new Set(extractLinks(content).map((l) => basename(l.target)))],
        );
      }
      set({
        notes: paths.map((p) => ({
          path: p,
          base: (p.split("/").pop() ?? p).replace(/\.(md|markdown|mdx)$/i, ""),
        })),
        links,
        outgoing,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },
}));

export function backlinksFor(
  state: Pick<VaultIndexState, "links">,
  notePath: string,
): string[] {
  const base = basename(notePath);
  const sources = state.links.get(base) ?? [];
  return [...new Set(sources.filter((s) => s !== notePath))];
}
