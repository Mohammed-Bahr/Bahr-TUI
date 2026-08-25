import { useEffect, useRef } from "react";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";
import {
  useVaultIndexStore,
  type NoteInfo,
} from "@/stores/vaultIndex";

interface Node extends NoteInfo {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Props {
  vaultPath: string;
  onOpenPath: (path: string, name: string) => void;
}

function buildGraph(notes: NoteInfo[], outgoing: Map<string, string[]>) {
  const index = new Map(notes.map((n, i) => [n.path, i]));
  const baseIndex = new Map(notes.map((n, i) => [n.base.toLowerCase(), i]));
  const nodes: Node[] = notes.map((n, i) => ({
    ...n,
    x: 400 + 180 * Math.cos((i / Math.max(1, notes.length)) * Math.PI * 2),
    y: 300 + 180 * Math.sin((i / Math.max(1, notes.length)) * Math.PI * 2),
    vx: 0,
    vy: 0,
  }));
  const edges: Array<[number, number]> = [];
  for (const n of notes) {
    const from = index.get(n.path)!;
    for (const target of outgoing.get(n.path) ?? []) {
      let ti = index.get(target) ?? -1;
      if (ti < 0) ti = baseIndex.get(target) ?? -1;
      if (ti >= 0 && ti !== from) edges.push([from, ti]);
    }
  }
  return { nodes, edges };
}

export default function GraphView({ vaultPath, onOpenPath }: Props) {
  void vaultPath;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Array<[number, number]>>([]);
  const degreesRef = useRef<number[]>([]);
  const hoverRef = useRef<number | null>(null);

  const { theme } = useTuiTheme();
  const ui = theme.ui;

  // Rebuild whenever the vault index changes.
  useEffect(() => {
    const rebuild = () => {
      const { notes, outgoing } = useVaultIndexStore.getState();
      const g = buildGraph(notes, outgoing);
      nodesRef.current = g.nodes;
      edgesRef.current = g.edges;
      const deg = g.nodes.map(() => 0);
      for (const [a, b] of g.edges) {
        deg[a]++;
        deg[b]++;
      }
      degreesRef.current = deg;
    };
    rebuild();
    return useVaultIndexStore.subscribe(rebuild);
  }, []);

  // Simulation + render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const tick = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // repulsion (skipped for very large graphs)
      if (nodes.length <= 500) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < 1) {
              dx = Math.random() - 0.5;
              dy = Math.random() - 0.5;
              d2 = 1;
            }
            if (d2 > 90000) continue;
            const f = 6000 / d2;
            const d = Math.sqrt(d2);
            a.vx += (dx / d) * f;
            a.vy += (dy / d) * f;
            b.vx -= (dx / d) * f;
            b.vy -= (dy / d) * f;
          }
        }
      }
      // centering
      for (const n of nodes) {
        n.vx += (width / 2 - n.x) * 0.004;
        n.vy += (height / 2 - n.y) * 0.004;
      }
      // springs
      for (const [ai, bi] of edges) {
        const a = nodes[ai];
        const b = nodes[bi];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const f = (d - 110) * 0.02;
        a.vx += (dx / d) * f;
        a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f;
        b.vy -= (dy / d) * f;
      }
      for (const n of nodes) {
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += Math.max(-6, Math.min(6, n.vx));
        n.y += Math.max(-6, Math.min(6, n.vy));
      }

      // draw
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = hexToCssRgb(ui.text, 0.22);
      ctx.lineWidth = 1;
      for (const [ai, bi] of edges) {
        ctx.beginPath();
        ctx.moveTo(nodes[ai].x, nodes[ai].y);
        ctx.lineTo(nodes[bi].x, nodes[bi].y);
        ctx.stroke();
      }
      const hover = hoverRef.current;
      const showLabels = nodes.length <= 80;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const isHover = hover === i;
        const r = 3.5 + Math.min(8, (degreesRef.current[i] ?? 0) * 1.2) + (isHover ? 2 : 0);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? ui.accent : hexToCssRgb(ui.accent, 0.85);
        ctx.fill();
        if (isHover || showLabels) {
          ctx.fillStyle = isHover ? ui.text : ui.muted;
          ctx.font = `${isHover ? "600 " : ""}11px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(n.base, n.x, n.y + r + 13);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const findNode = (e: MouseEvent): number | null => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let best: number | null = null;
      let bestD = 14;
      nodesRef.current.forEach((n, i) => {
        const d = Math.hypot(n.x - mx, n.y - my);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    };

    const onMove = (e: MouseEvent) => {
      hoverRef.current = findNode(e);
    };
    const onClick = (e: MouseEvent) => {
      const i = findNode(e);
      if (i != null) {
        const n = nodesRef.current[i];
        onOpenPath(n.path, n.base);
      }
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui]);

  return (
    <div
      ref={wrapRef}
      className="relative h-full min-h-0 w-full overflow-hidden"
      style={{ background: ui.background }}
    >
      <canvas ref={canvasRef} className="h-full w-full cursor-pointer" />
      <p
        className="pointer-events-none absolute bottom-3 right-4 text-[10px]"
        style={{ color: ui.muted }}
      >
        Click a node to open its note
      </p>
    </div>
  );
}
