import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToRgb } from "@/lib/color";

function bootLines(accent: string) {
  return [
    "  ████████╗██╗   ██╗██╗        ",
    "  ╚══██╔══╝██║   ██║██║        ",
    "     ██║   ██║   ██║██║        ",
    "     ██║   ██║   ██║██║        ",
    "     ██║   ╚██████╔╝██║        ",
    "     ╚═╝    ╚═════╝ ╚═╝        ",
    "",
    `  \x1b[38;2;${hexToRgb(accent)}mWelcome to TUI — a beautiful terminal experience\x1b[0m`,
    "  Type 'help' to get started.",
    "",
  ].join("\r\n");
}

export default function terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  const { theme } = useTuiTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0.4,
      theme: themeRef.current.colors,
      scrollback: 5000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(terminalRef.current);
    fit.fit();
    fitRef.current = fit;

    term.writeln(bootLines(themeRef.current.ui.accent));

    const prompt = () =>
      term.write(
        `\x1b[1;38;2;${hexToRgb(themeRef.current.ui.accent2)}m➜ \x1b[0m\x1b[38;2;${hexToRgb(themeRef.current.ui.accent)}mtui\x1b[0m ~ $ `,
      );
    prompt();

    const handleResize = () => fit.fit();
    window.addEventListener("resize", handleResize);

    const observer = new ResizeObserver(handleResize);
    observer.observe(terminalRef.current);

    const help = () =>
      term.writeln(
        [
          `\x1b[1;38;2;${hexToRgb(themeRef.current.ui.accent)}mAvailable commands:\x1b[0m`,
          "  \x1b[32mhelp\x1b[0m   show this message",
          "  \x1b[32mwhoami\x1b[0m  who you are",
          "  \x1b[32mdate\x1b[0m   current date & time",
          "  \x1b[32mclear\x1b[0m  clear the terminal",
          "",
        ].join("\r\n"),
      );

    let line = "";
    term.onData((data) => {
      if (data === "\r") {
        term.write("\r\n");
        const cmd = line;
        line = "";
        switch (cmd.trim()) {
          case "help":
            help();
            break;
          case "whoami":
            term.writeln(
              "  \x1b[35mYou are a beautiful human using a TUI. ✨\x1b[0m",
            );
            break;
          case "date":
            term.writeln("  " + new Date().toString());
            break;
          case "clear":
            term.clear();
            break;
          case "":
            break;
          default:
            term.writeln(
              `  \x1b[1;31mcommand not found:\x1b[0m \x1b[33m${cmd}\x1b[0m`,
            );
        }
        prompt();
      } else if (data === "\x7f") {
        if (line.length > 0) {
          line = line.slice(0, -1);
          term.write("\b \b");
        }
      } else {
        line += data;
        term.write(data);
      }
    });

    termRef.current = term;
    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = theme.colors;
    }
    requestAnimationFrame(() => fitRef.current?.fit());
  }, [theme]);

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden antialiased transition-colors duration-300"
      style={{ background: theme.ui.background, color: theme.ui.text }}
    >
      <div ref={terminalRef} className="min-h-0 flex-1 px-2 py-2 [&_.xterm]:h-full" />
    </div>
  );
}
