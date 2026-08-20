export interface XtermPalette {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface TuiUiColors {
  background: string;
  surface: string;
  border: string;
  accent: string;
  accentSoft: string;
  accent2: string;
  accent2Soft: string;
  text: string;
  muted: string;
}

export interface TuiTheme {
  id: string;
  name: string;
  description: string;
  colors: XtermPalette;
  ui: TuiUiColors;
}