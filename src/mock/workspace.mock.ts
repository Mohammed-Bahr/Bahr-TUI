export interface MockWorkspace {
  id: string;
  name: string;
  rootPath: string;
}

export const mockWorkspace: MockWorkspace = {
  id: "ws-1",
  name: "tui",
  rootPath: "/Users/dev/projects/tui",
};