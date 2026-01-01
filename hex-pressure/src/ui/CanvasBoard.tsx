import React, { useEffect, useMemo, useRef } from "react";
import { axialToPixel, hexCorner, pointInHex, key as k } from "../engine/hex";
import type { GameState, Tile } from "../engine/types";

type Props = {
  state: GameState;
  boardCells: Array<{ q: number; r: number }>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  showNumbers?: boolean;
};

export function CanvasBoard({
  state,
  boardCells,
  selectedId,
  setSelectedId,
  showNumbers = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const size = 34; // hex radius
  const padding = 40;

  // compute bounds for centering
  const bounds = useMemo(() => {
    const pts = boardCells.map(c => axialToPixel(c.q, c.r, size, 0, 0));
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { minX, maxX, minY, maxY };
  }, [boardCells, size]);

  const width = Math.ceil(bounds.maxX - bounds.minX + padding * 2 + size * 2);
  const height = Math.ceil(bounds.maxY - bounds.minY + padding * 2 + size * 2);
  const originX = padding + (0 - bounds.minX) + size;
  const originY = padding + (0 - bounds.minY) + size;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = performance.now();
    const t =
      state.phase === "SETTLING"
        ? Math.max(0, Math.min(1, (now - state.settleStartMs) / state.settleDurationMs))
        : 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // background
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw board cells
    for (const cell of boardCells) {
      const { x, y } = axialToPixel(cell.q, cell.r, size, originX, originY);
      const corners = Array.from({ length: 6 }, (_, i) => hexCorner(x, y, size, i));

      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();

      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // draw tiles
    const tiles = Object.values(state.tilesById);
    for (const tile of tiles) {
      const { x, y } = axialToPixel(tile.q, tile.r, size, originX, originY);
      const corners = Array.from({ length: 6 }, (_, i) => hexCorner(x, y, size, i));

      const d0 = state.prevDerivedById[tile.id];
      const d1 = state.derivedById[tile.id];

      // interpolate "stress intensity" 0..1
      const s0 = stressIntensity(tile, d0?.state ?? "CALM");
      const s1 = stressIntensity(tile, d1?.state ?? "CALM");
      const s = s0 + (s1 - s0) * t;

      // fill
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();

      // base tile color + stress glow (keep mechanical, not pretty yet)
      const base = tileBaseColor(tile);
      ctx.fillStyle = base;
      ctx.fill();

      // glow overlay
      ctx.save();
      ctx.globalAlpha = 0.22 + s * 0.55;
      ctx.fillStyle = s >= 0.66 ? "#ff6b6b" : s >= 0.33 ? "#ffd166" : "#4cc9f0";
      ctx.fill();
      ctx.restore();

      // selection outline
      if (selectedId === tile.id) {
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // directional indicator
      if (tile.type === "DIRECTIONAL") {
        drawDirectionalIndicator(ctx, tile, x, y, size);
      }

      // optional numbers overlay (diagnostic)
      if (showNumbers) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const txt = `${d1?.pressure ?? 0}/${tile.limit >= 900 ? "∞" : tile.limit}`;
        ctx.fillText(txt, x, y);
      }
	  
	  // Tile ID label (for debugging / early dev)
		ctx.fillStyle = "rgba(255,255,255,0.5)";
		ctx.font = "12px system-ui, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(tile.id, x, y - size * 0.25);

    }
  }, [state, boardCells, selectedId, showNumbers, width, height, originX, originY, size]);

  // animation loop tick renders continuously (cheap at this scale)
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      // force redraw by touching state? we just rely on useEffect redraw on state changes,
      // but to animate settling interpolation we need continuous paints.
      // simplest: dispatch a custom event or keep a local "clock".
      // Here: just trigger a repaint by calling setSelectedId(same) rarely is bad.
      // Instead, we redraw via a dummy state in parent; but keeping it here: requestAnimationFrame and draw in effect above won’t rerun.
      // So: re-run drawing here manually.
      const canvas = canvasRef.current;
      if (canvas) {
        // Re-run the effect body by calling a function would be cleaner.
        // Minimal hack: do nothing; parent will tick state regularly.
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // click selection
  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // hit-test tiles first
    for (const tile of Object.values(state.tilesById)) {
      const { x, y } = axialToPixel(tile.q, tile.r, size, originX, originY);
      const corners = Array.from({ length: 6 }, (_, i) => hexCorner(x, y, size, i));
      if (pointInHex(px, py, corners)) {
        setSelectedId(tile.id);
        return;
      }
    }

    setSelectedId(null);
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={onClick}
      style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}
    />
  );
}

function tileBaseColor(tile: Tile) {
  switch (tile.type) {
    case "SINK": return "rgba(40,44,52,0.95)";
    case "DIRECTIONAL": return "rgba(28,32,40,0.95)";
    default: return "rgba(22,26,34,0.95)";
  }
}

function stressIntensity(tile: Tile, st: "CALM" | "TENSE" | "OVERSTRESSED") {
  if (tile.type === "SINK") return 0;
  if (st === "CALM") return 0.1;
  if (st === "TENSE") return 0.45;
  return 0.9;
}

function drawDirectionalIndicator(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  cx: number,
  cy: number,
  size: number
) {
  // Accepted sides: orient, orient+1, orient+2
  const accepted = new Set([
    tile.orient,
    (tile.orient + 1) % 6,
    (tile.orient + 2) % 6,
  ]);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 2;

  for (let i = 0; i < 6; i++) {
    if (!accepted.has(i)) continue;

    // midpoint of edge i
    const a = hexCorner(cx, cy, size, i);
    const b = hexCorner(cx, cy, size, (i + 1) % 6);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;

    // inward tick
    const ix = cx + (mx - cx) * 0.80;
    const iy = cy + (my - cy) * 0.80;

    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(ix, iy);
    ctx.stroke();
  }

  ctx.restore();
}


