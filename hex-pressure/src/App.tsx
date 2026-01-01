import React, { useEffect, useMemo, useReducer, useState } from "react";
import { LEVELS } from "./engine/levels";
import { applyMove, initFromLevel, tick } from "./engine/engine";
import type { GameState, Move } from "./engine/types";
import { CanvasBoard } from "./ui/CanvasBoard";
import { logValidation } from "./engine/validate";

type Action =
  | { type: "LOAD_LEVEL"; index: number }
  | { type: "MOVE"; move: Move; now: number }
  | { type: "TICK"; now: number };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "LOAD_LEVEL": {
      const level = LEVELS[action.index];
      return initFromLevel(level, 300);
    }
    case "MOVE":
      return applyMove(state, action.move, action.now);
    case "TICK":
      return tick(state, action.now);
    default:
      return state;
  }
}

export default function App() {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];

  const [state, dispatch] = useReducer(reducer, initFromLevel(level, 300));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNumbers, setShowNumbers] = useState(
	  level.rules.defaultShowNumbers ?? true
	);
	const [showHud, setShowHud] = useState(true);

  const selectedTile = selectedId ? state.tilesById[selectedId] : null;
	const canRotate =
	  !!selectedTile &&
	  selectedTile.type === "DIRECTIONAL" &&
	  state.phase !== "SETTLING" &&
	  state.phase !== "SOLVED";

	
	{!selectedTile ? "Select a tile" : selectedTile.type !== "DIRECTIONAL" ? "Not rotatable" : "Rotate ⟲ (Q)"}

  // RAF tick loop for settling animation gating
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      dispatch({ type: "TICK", now });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const now = performance.now();
      if (e.key === "q" || e.key === "Q") {
        if (!selectedId) return;
        dispatch({ type: "MOVE", move: { kind: "ROTATE", tileId: selectedId, dir: "CCW" }, now });
      } else if (e.key === "e" || e.key === "E") {
        if (!selectedId) return;
        dispatch({ type: "MOVE", move: { kind: "ROTATE", tileId: selectedId, dir: "CW" }, now });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
		  if (state.undoStack.length === 0 || state.phase === "SETTLING") return;
		  dispatch({ type: "MOVE", move: { kind: "UNDO" }, now });
		}
		else if (e.key === "n" || e.key === "N") {
        setShowNumbers(s => !s);
      } else if (e.key === "h" || e.key === "H") {
		  setShowHud(v => !v);
		}
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, state.phase, state.undoStack.length]);

  const solved = state.phase === "SOLVED";
  const overstressedCount = Object.values(state.derivedById).filter(d => d.state === "OVERSTRESSED").length;
  const canUndo = state.undoStack.length > 0 && state.phase !== "SETTLING";

  const scoreText = useMemo(() => {
    const moves = state.moveCount;
    const ideal = level.scoring.idealMoves;
    const two = level.scoring.twoStarMax;
    const stars = moves <= ideal ? 3 : moves <= two ? 2 : 1;
    const ascended = moves < ideal;
    return { stars, ascended, moves, ideal, two };
  }, [state.moveCount, level.scoring]);

  function load(i: number) {
	  setLevelIndex(i);
	  const lvl = LEVELS[i];
	  logValidation(lvl);
	  dispatch({ type: "LOAD_LEVEL", index: i });
	  logValidation(level);
	  setShowNumbers(lvl.rules.defaultShowNumbers ?? true);
	  setSelectedId(null);
	}


  function rotate(dir: "CW" | "CCW") {
    if (!selectedId) return;
    dispatch({ type: "MOVE", move: { kind: "ROTATE", tileId: selectedId, dir }, now: performance.now() });
  }

  function undo() {
    dispatch({ type: "MOVE", move: { kind: "UNDO" }, now: performance.now() });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, padding: 16, minHeight: "100vh", background: "#0b0f14", color: "white", fontFamily: "system-ui, sans-serif", }}>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 650 }}>Hex Pressure</div>
          <div style={{ opacity: 0.75 }}>{level.name}</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "baseline" }}>
			<div style={{ opacity: 0.85 }}>Moves: {state.moveCount}</div>
			<div style={{ opacity: 0.85 }}>
				{overstressedCount === 0 ? "All stable" : `Overstressed: ${overstressedCount}`}
			</div>
			</div>
        </div>

        <CanvasBoard
          state={state}
          boardCells={level.board.cells}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          showNumbers={showNumbers}
        />
		
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={() => rotate("CCW")} disabled={!canRotate}>Rotate ⟲ (Q)</button>
		<button onClick={() => rotate("CW")} disabled={!canRotate}>Rotate ⟳ (E)</button>
          <button onClick={undo} disabled={!canUndo}>Undo (Ctrl/Cmd+Z)</button>
		  <button onClick={() => load(levelIndex)} disabled={state.phase === "SETTLING"}>Retry</button>
          <button onClick={() => setShowNumbers(v => !v)} style={{ marginLeft: "auto" }}>
            {showNumbers ? "Hide" : "Show"} Pressure Insight (N)
          </button>
        </div>

        {solved && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 650 }}>
                Solved{" "}
                <span style={{ color: scoreText.ascended ? "#ff4fd8" : "#f4c542" }}>
                  {"★".repeat(scoreText.stars)}
                </span>
              </div>
              <div style={{ opacity: 0.8 }}>
                {scoreText.moves} moves (ideal {scoreText.ideal}, 2★ ≤ {scoreText.two})
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
				  <button
					onClick={() => load(Math.max(0, levelIndex - 1))}
					disabled={levelIndex <= 0}
				  >
					Back
				  </button>

				  <button
					onClick={() => load(Math.min(LEVELS.length - 1, levelIndex + 1))}
					disabled={levelIndex >= LEVELS.length - 1}
				  >
					Next
				  </button>
				</div>
            </div>
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
              Tip: In this prototype, “ideal” is hand-set. Once the feel is right, we’ll compute it with a solver.
            </div>
          </div>
        )}
		
		{import.meta.env.DEV && showHud && (
		  <div
			style={{
			  marginTop: 10,
			  padding: 10,
			  borderRadius: 12,
			  border: "1px solid rgba(255,255,255,0.12)",
			  background: "rgba(255,255,255,0.03)",
			  fontSize: 12,
			  lineHeight: 1.4,
			  opacity: 0.9,
			  userSelect: "text",
			}}
		  >
			<div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
			  <div style={{ fontWeight: 650 }}>Dev HUD</div>
			  <div style={{ opacity: 0.7 }}>Toggle: H</div>
			  <div style={{ marginLeft: "auto", opacity: 0.8 }}>
				Phase: {state.phase} • Moves: {state.moveCount}
			  </div>
			</div>

			<div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 10 }}>
			  {Object.values(state.tilesById)
				.slice()
				.sort((a, b) => a.id.localeCompare(b.id))
				.map(t => {
				  const d = state.derivedById[t.id];
				  const lim = t.limit >= 900 ? "∞" : String(t.limit);
				  const sel = selectedId === t.id;
				  return (
					<div
					  key={t.id}
					  style={{
						padding: "4px 8px",
						borderRadius: 999,
						border: sel ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.12)",
						background: sel ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
					  }}
					  title={`${t.type} @ (${t.q},${t.r})`}
					>
					  <span style={{ fontWeight: 700 }}>{t.id}</span>{" "}
					  <span style={{ opacity: 0.85 }}>
						{d?.pressure ?? 0}/{lim}
					  </span>{" "}
					  <span style={{ opacity: 0.7 }}>
						{d?.state ?? "?"} • o{t.orient}
					  </span>
					</div>
				  );
				})}
			</div>
		  </div>
		)}
      </div>

      <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}>
        <div style={{ fontWeight: 650, marginBottom: 10 }}>Levels</div>
        <div style={{ display: "grid", gap: 8 }}>
          {LEVELS.map((l, i) => (
            <button
              key={l.id}
              onClick={() => load(i)}
              style={{
                textAlign: "left",
                padding: "10px 10px",
                borderRadius: 10,
                border: i === levelIndex ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
                background: i === levelIndex ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 600 }}>{l.name}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{l.id}</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
          <div><b>Controls</b></div>
          <div>Click tile to select</div>
          <div>Q / E rotate</div>
          <div>Ctrl/Cmd+Z undo</div>
          <div>N toggles numbers</div>
        </div>
      </div>

      <style>{`
        button {
          color: white;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        button:hover:not(:disabled) {
          background: rgba(255,255,255,0.10);
        }
      `}</style>
    </div>
  );
}
