import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Vault {
  id: string;
  name: string;
  path: string;
}

interface VaultState {
  vaults: Vault[];
  activeId: string | null;
  addVault: (vault: Vault) => void;
  removeVault: (id: string) => void;
  setActive: (id: string | null) => void;
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set) => ({
      vaults: [],
      activeId: null,
      addVault: (vault) =>
        set((s) =>
          s.vaults.some((v) => v.path === vault.path)
            ? { activeId: vault.id }
            : { vaults: [...s.vaults, vault], activeId: vault.id },
        ),
      removeVault: (id) =>
        set((s) => {
          const vaults = s.vaults.filter((v) => v.id !== id);
          return {
            vaults,
            activeId:
              s.activeId === id ? (vaults[0]?.id ?? null) : s.activeId,
          };
        }),
      setActive: (id) => set({ activeId: id }),
    }),
    {
      name: "tui.vaults",
    },
  ),
);

export function useActiveVault(): Vault | null {
  const vaults = useVaultStore((s) => s.vaults);
  const activeId = useVaultStore((s) => s.activeId);
  return vaults.find((v) => v.id === activeId) ?? null;
}

export function vaultNameFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}
