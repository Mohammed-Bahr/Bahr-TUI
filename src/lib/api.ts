import { invoke } from "@tauri-apps/api/core";

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface GitFile {
  path: string;
  x: string;
  y: string;
}

export const homeDir = () => invoke<string>("home_dir");
export const listDir = (path: string) => invoke<DirEntry[]>("list_dir", { path });
export const readFile = (path: string) => invoke<string>("read_file", { path });
export const writeFile = (path: string, content: string) =>
  invoke<void>("write_file", { path, content });

export const gitIsRepo = (cwd: string) => invoke<boolean>("git_is_repo", { cwd });
export const gitInit = (cwd: string) => invoke<string>("git_init", { cwd });
export const gitBranch = (cwd: string) => invoke<string>("git_branch", { cwd });
export const gitStatus = (cwd: string) => invoke<GitFile[]>("git_status", { cwd });
export const gitStage = (cwd: string, file: string) =>
  invoke<string>("git_stage", { cwd, file });
export const gitUnstage = (cwd: string, file: string) =>
  invoke<string>("git_unstage", { cwd, file });
export const gitCommit = (cwd: string, message: string) =>
  invoke<string>("git_commit", { cwd, message });
export const gitPush = (cwd: string) => invoke<string>("git_push", { cwd });
export const gitPull = (cwd: string) => invoke<string>("git_pull", { cwd });

export interface PtyOutputEvent {
  id: string;
  data: string;
}

export const ptySpawn = (
  id: string,
  cwd: string,
  program?: string,
  args?: string[],
) => invoke<void>("pty_spawn", { id, cwd, program, args });
export const ptyWrite = (id: string, data: string) =>
  invoke<void>("pty_write", { id, data });
export const ptyResize = (id: string, cols: number, rows: number) =>
  invoke<void>("pty_resize", { id, cols, rows });
export const ptyKill = (id: string) => invoke<void>("pty_kill", { id });

export const MARKDOWN_EXTS = new Set(["md", "markdown", "mdx"]);

export function isMarkdown(name: string): boolean {
  const i = name.lastIndexOf(".");
  return i >= 0 && MARKDOWN_EXTS.has(name.slice(i + 1).toLowerCase());
}
