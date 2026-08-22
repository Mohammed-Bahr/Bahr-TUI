import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Thin wrapper around Tauri's window API. Since app.windows[0].decorations
 * is false in tauri.conf.json, the frontend owns the title bar chrome and
 * needs these commands to minimize/maximize/close.
 *
 * Requires the window minimize/maximize/close permissions to be granted in
 * src-tauri/capabilities/*.json — see Integration Notes.
 */
export const windowService = {
  minimize: () => getCurrentWindow().minimize(),

  toggleMaximize: async () => {
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  },

  close: () => getCurrentWindow().close(),
};