import { useEffect, useState } from "react";
import {
  ChevronDown,
  FilePlus2,
  Files,
  GitBranch,
  ListTree,
  Network,
  Plus,
  Trash2,
  Vault as VaultIcon,
} from "lucide-react";
import FileTree from "@/components/FileTree";
import FolderPicker from "@/components/FolderPicker";
import GitPanel from "@/components/GitPanel";
import OutlinePanel from "@/components/OutlinePanel";
import { hexToCssRgb } from "@/lib/color";
import { isMarkdown, listDir, readFile, writeFile, type DirEntry } from "@/lib/api";
import {
  useActiveVault,
  useVaultStore,
  vaultNameFromPath,
} from "@/stores/vaults";
import { useWorkspaceStore } from "@/stores/workspace";
import { useTuiTheme } from "@/themes/ThemeContext";

type SidebarView = "files" | "git" | "outline";

interface SidebarProps {
  selectedPath: string | null;
  onOpenFile: (entry: DirEntry) => void;
}

export default function Sidebar({ selectedPath, onOpenFile }: SidebarProps) {
  const { theme } = useTuiTheme();
  const ui = theme.ui;

  const activeVault = useActiveVault();
  const { vaults, addVault, removeVault, setActive } = useVaultStore();

  const [view, setView] = useState<SidebarView>("files");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [treeKey, setTreeKey] = useState(0);

  // Reindex the vault whenever it changes.
  useEffect(() => {
    if (!activeVault) return;
    void import("@/stores/vaultIndex").then(({ useVaultIndexStore }) =>
      useVaultIndexStore.getState().reindex(activeVault.path),
    );
    setTreeKey((k) => k + 1);
  }, [activeVault?.path]);

  const createNote = async () => {
    if (!activeVault) return;
    let existing: string[] = [];
    try {
      existing = (await listDir(activeVault.path))
        .filter((e) => !e.is_dir && isMarkdown(e.name))
        .map((e) => e.name.toLowerCase());
    } catch {
      /* ignore */
    }
    let name = "Untitled.md";
    for (let i = 2; existing.includes(name.toLowerCase()); i++)
      name = `Untitled ${i}.md`;
    const path = `${activeVault.path}/${name}`;
    await writeFile(path, `# ${name.replace(/\.md$/, "")}\n\n`);
    const content = await readFile(path);
    const { useNoteContentStore } = await import("@/stores/noteContent");
    useNoteContentStore.getState().publish(path, content);
    setTreeKey((k) => k + 1);
    void import("@/stores/vaultIndex").then(({ useVaultIndexStore }) =>
      useVaultIndexStore.getState().reindex(activeVault.path),
    );
    useWorkspaceStore.getState().openNote(path, name);
  };

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      style={{ background: ui.background }}
    >
      {/* Vault switcher */}
      <div className="relative shrink-0 px-2 pt-2">
        <button
          type="button"
          onClick={() => setSwitcherOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors duration-150"
          style={{
            background: switcherOpen
              ? hexToCssRgb(ui.text, 0.1)
              : hexToCssRgb(ui.text, 0.05),
          }}
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{ background: ui.accentSoft }}
          >
            <VaultIcon className="h-3.5 w-3.5" style={{ color: ui.accent }} />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block truncate text-[13px] font-semibold leading-tight"
              style={{ color: ui.text }}
            >
              {activeVault ? activeVault.name : "No vault"}
            </span>
            <span className="block truncate text-[10px] leading-tight" style={{ color: ui.muted }}>
              {activeVault ? activeVault.path : "Add a folder to start"}
            </span>
          </span>
          <ChevronDown
            className={"h-4 w-4 shrink-0 transition-transform duration-200" + (switcherOpen ? " rotate-180" : "")}
            style={{ color: ui.muted }}
          />
        </button>

        {switcherOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setSwitcherOpen(false)} />
            <div
              className="absolute inset-x-2 top-full z-40 mt-1 overflow-hidden rounded-lg border shadow-xl"
              style={{
                borderColor: hexToCssRgb(ui.text, 0.15),
                background: ui.surface,
              }}
            >
              <div className="max-h-64 overflow-y-auto py-1">
                {vaults.length === 0 && (
                  <p className="px-3 py-2 text-xs" style={{ color: ui.muted }}>
                    No vaults yet.
                  </p>
                )}
                {vaults.map((v) => (
                  <div key={v.id} className="group flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setActive(v.id);
                        setSwitcherOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left transition-colors"
                      style={{
                        background:
                          v.id === activeVault?.id
                            ? ui.accentSoft
                            : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (v.id !== activeVault?.id)
                          e.currentTarget.style.background =
                            hexToCssRgb(ui.text, 0.08);
                      }}
                      onMouseLeave={(e) => {
                        if (v.id !== activeVault?.id)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <VaultIcon
                        className="h-3.5 w-3.5 shrink-0"
                        style={{
                          color: v.id === activeVault?.id ? ui.accent : ui.muted,
                        }}
                      />
                      <span
                        className="truncate text-[12px] font-medium"
                        style={{
                          color: v.id === activeVault?.id ? ui.accent : ui.text,
                        }}
                      >
                        {v.name}
                      </span>
                    </button>
                    <button
                      type="button"
                      title={`Remove ${v.name} from list`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeVault(v.id);
                      }}
                      className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                      style={{ color: ui.muted }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(true);
                  setSwitcherOpen(false);
                }}
                className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-white/5"
                style={{ borderColor: hexToCssRgb(ui.text, 0.1), color: ui.accent }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add vault…
              </button>
            </div>
          </>
        )}
      </div>

      {/* Body */}
      {!activeVault ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <Files className="h-6 w-6" style={{ color: ui.muted }} />
          <p className="text-xs leading-relaxed" style={{ color: ui.muted }}>
            Click your vault name above to add a folder as a vault.
          </p>
        </div>
      ) : view === "git" ? (
        <GitPanel vaultPath={activeVault.path} />
      ) : view === "outline" ? (
        <OutlinePanel />
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            className="flex items-center justify-between px-3 pb-1 pt-2"
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: ui.muted }}
            >
              Notes
            </span>
            <button
              type="button"
              title="New note"
              onClick={() => void createNote()}
              className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-white/10"
              style={{ color: ui.muted }}
            >
              <FilePlus2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div key={treeKey} className="h-[calc(100%-28px)] overflow-y-auto px-2 pb-2">
            <FileTree
              root={activeVault.path}
              selectedPath={selectedPath}
              onOpenFile={onOpenFile}
            />
          </div>
        </div>
      )}

      {/* Bottom view switcher */}
      <div
        className="flex shrink-0 items-center gap-1 border-t p-2"
        style={{ borderColor: hexToCssRgb(ui.text, 0.08) }}
      >
        {(
          [
            { id: "files", label: "Files", Icon: Files },
            { id: "outline", label: "Outline", Icon: ListTree },
            { id: "git", label: "Git", Icon: GitBranch },
          ] as const
        ).map(({ id, label, Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              title={`${label} panel`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors duration-150"
              style={{
                background: active ? ui.accentSoft : "transparent",
                color: active ? ui.accent : ui.muted,
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
        <button
          type="button"
          title="Open graph view"
          disabled={!activeVault}
          onClick={() => activeVault && useWorkspaceStore.getState().openGraph(activeVault.path)}
          className="flex items-center justify-center rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white/5"
          style={{ color: ui.muted }}
        >
          <Network className="h-3.5 w-3.5" />
        </button>
      </div>

      {pickerOpen && (
        <FolderPicker
          onSelect={(path) => {
            addVault({
              id: crypto.randomUUID(),
              name: vaultNameFromPath(path),
              path,
            });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
