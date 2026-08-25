import { EditorView } from "@codemirror/view";

/** path -> active EditorView, used by the outline panel to jump to lines. */
export const editorRegistry = new Map<string, EditorView>();

export function revealLine(path: string, line: number) {
  const view = editorRegistry.get(path);
  if (!view) return;
  const lineInfo = view.state.doc.line(Math.min(line + 1, view.state.doc.lines));
  view.dispatch({
    selection: { anchor: lineInfo.from },
    effects: [
      // scroll the heading into view (place it a bit down from the top)
      EditorView.scrollIntoView(lineInfo.from, { y: "start", yMargin: 48 }),
    ],
  });
  view.focus();
}
