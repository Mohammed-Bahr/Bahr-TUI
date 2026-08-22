export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const v = parseInt(h, 16);
  return `${(v >> 16) & 255};${(v >> 8) & 255};${v & 255}`;
}

export function hexToCssRgb(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const v = parseInt(h, 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}
