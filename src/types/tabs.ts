import type { ID } from "./common";

export type TabType = "terminal" | "note" | "agent" | "editor";

export interface BaseTab {
  id: ID;
  type: TabType;
  title: string;
  isDirty: boolean;
  isPinned: boolean;
  /** Icon key resolved by the consuming component; kept generic here on purpose. */
  icon?: string;
}

export interface PaneTabs {
  paneId: ID;
  tabIds: ID[];
  activeTabId: ID | null;
}
