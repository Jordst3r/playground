import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { LEVELS } from "./engine/levels";
import { applyMove, initFromLevel, tick, canRotateAt, tileIdAt } from "./engine/engine";
import type { GameState, Move } from "./engine/types";
import { CanvasBoard } from "./ui/CanvasBoard";
import { logValidation } from "./engine/validate";
import { solveRotateOnly } from "./engine/solver";
import { starsForMoves } from "./engine/scoring";
import {
  loadReplays,
  saveReplays,
  clearReplaysByLevel,
  clearReplaysBySection,
  clearAllReplays,
  type Recording,
  type LevelReplays,
  type ReplayMove,
} from "./engine/storage";

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

/** --- Replay types --- */
type ReplayMode = "latest" | "best";

type ReplayStatus =
  | { state: "idle" }
  | { state: "loading"; recording: Recording; index: number; speedMs: number }
  | { state: "playing"; recording: Recording; index: number; speedMs: number }
  | { state: "done"; recording: Recording }
  | { state: "error"; message: string };

type ReplayCtrl = {
  recording: Recording;
  index: number;
  speedMs: number;
  runId: number; // prevents stale timers from older runs
};

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => JSON.stringify(k) + ":" + stableStringify((obj as Record<string, unknown>)[k])).join(",")}}`;
}

function fnv1a32(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function computeLevelHash(levelDef: unknown): string {
  return fnv1a32(stableStringify(levelDef));
}

// Main App component
export default function App() {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];

  const [state, dispatch] = useReducer(reducer, initFromLevel(level, 300));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNumbers, setShowNumbers] = useState(level.rules.defaultShowNumbers ?? true);
  const [showHud, setShowHud] = useState(true);

  // Accordion state: track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(["Introduction"]));

  /** Replay state (initialized from localStorage) */
  const [replaysByLevel, setReplaysByLevel] = useState<Record<string, LevelReplays>>(() => loadReplays());
  const [replayStatus, setReplayStatus] = useState<ReplayStatus>({ state: "idle" });
  const [replaySpeedMs, setReplaySpeedMs] = useState<number>(120);

  const isReplaying = replayStatus.state === "loading" || replayStatus.state === "playing";

  // Persist replays to localStorage whenever they change
  useEffect(() => {
    saveReplays(replaysByLevel);
  }, [replaysByLevel]);

  // Keep latest state in a ref so replay timers don't close over stale state.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Current run recording (net of undo). We store axial coords + dir.
  const currentRunRef = useRef<ReplayMove[]>([]);
  const resetRunRecording = () => {
    currentRunRef.current = [];
  };

  const replayCtrlRef = useRef<ReplayCtrl | null>(null);
  const replayRunIdRef = useRef(0);

  // Helper function to calculate stars for a level
  const starsForLevel = useCallback((levelId: string, ideal: number, twoStarMax: number): number | null => {
    const slots = replaysByLevel[levelId];
    const rec = slots?.best ?? slots?.latest;
    if (!rec) return null; // not completed
    return starsForMoves(rec.moves.length, ideal, twoStarMax);
  }, [replaysByLevel]);

  // Group levels by section and track section order
  const levelsBySection = useMemo(() => {
    const groups: Record<string, Array<{ level: typeof LEVELS[0]; index: number }>> = {};
    const sectionOrder: string[] = [];

    LEVELS.forEach((lvl, idx) => {
      const sectionName = lvl.section ?? "Other";
      if (!groups[sectionName]) {
        groups[sectionName] = [];
        sectionOrder.push(sectionName);
      }
      groups[sectionName].push({ level: lvl, index: idx });
    });

    return { groups, sectionOrder };
  }, []);

  // Calculate section completion and unlock status
  const getSectionStats = useCallback((sectionName: string) => {
    const levels = levelsBySection.groups[sectionName] || [];
    const earnedStars = levels.reduce((acc, { level: l }) => {
      const stars = starsForLevel(l.id, l.scoring.idealMoves, l.scoring.twoStarMax);
      return acc + (stars ?? 0);
    }, 0);
    const maxStars = levels.length * 3;
    const completionPercent = maxStars > 0 ? Math.floor((earnedStars / maxStars) * 100) : 0;

    return { earnedStars, maxStars, completionPercent };
  }, [levelsBySection.groups, starsForLevel]);

  // Check if a section is unlocked
  const isSectionUnlocked = useCallback((sectionName: string): { unlocked: boolean; reason?: string } => {
    const sectionIndex = levelsBySection.sectionOrder.indexOf(sectionName);

    // First section is always unlocked
    if (sectionIndex === 0) {
      return { unlocked: true };
    }

    // Get the first level of this section to check unlock threshold
    const firstLevelInSection = levelsBySection.groups[sectionName]?.[0]?.level;
    if (!firstLevelInSection) {
      return { unlocked: true }; // No levels, consider unlocked
    }

    const threshold = firstLevelInSection.unlockThreshold ?? 80; // Default to 80%

    // Check previous section completion
    const previousSectionName = levelsBySection.sectionOrder[sectionIndex - 1];
    const prevStats = getSectionStats(previousSectionName);

    if (prevStats.completionPercent >= threshold) {
      return { unlocked: true };
    }

    const starsNeeded = Math.ceil((threshold / 100) * prevStats.maxStars);
    return {
      unlocked: false,
      reason: `Complete ${threshold}% of ${previousSectionName} (${starsNeeded}/${prevStats.maxStars} ★) to unlock`,
    };
  }, [levelsBySection.groups, levelsBySection.sectionOrder, getSectionStats]);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  };

  const selectedTile = selectedId ? state.tilesById[selectedId] : null;
  const canRotate =
    !!selectedTile &&
    selectedTile.type === "DIRECTIONAL" &&
    state.phase !== "SETTLING" &&
    state.phase !== "SOLVED" &&
    !isReplaying;

  const solved = state.phase === "SOLVED";
  const overstressedCount = Object.values(state.derivedById).filter(d => d.state === "OVERSTRESSED").length;
  const canUndo = state.undoStack.length > 0 && state.phase !== "SETTLING" && state.phase !== "SOLVED" && !isReplaying;

  // Helper functions
  function load(i: number) {
    setLevelIndex(i);
    const lvl = LEVELS[i];

    // Clear per-attempt run recording on any load.
    resetRunRecording();

    // Dev-only: validate + solver diagnostics
    if (import.meta.env.DEV) {
      logValidation(lvl);

      const res = solveRotateOnly(lvl);
      if (res.ok) {
        console.log(
          `[solver] ${lvl.id}: minMoves=${res.minMoves} (level idealMoves=${lvl.scoring.idealMoves}), visited=${res.visited}`
        );
      } else {
        console.warn(`[solver] ${lvl.id}: ${res.reason}, visited=${res.visited}`);
      }
    }

    dispatch({ type: "LOAD_LEVEL", index: i });

    setShowNumbers(lvl.rules.defaultShowNumbers ?? true);
    setSelectedId(null);
  }

  /** DEV reset controls */
  /**
   * Resets replay data for the current level.
   * Optionally shows a confirmation dialog before clearing.
   */
  const resetCurrentLevel = useCallback((skipConfirmation = false) => {
    if (!import.meta.env.DEV) return;

    const confirmed = skipConfirmation || window.confirm(
      `Reset replay data for "${level.name}"?\n\nThis will clear your best and latest replays for this level.`
    );

    if (confirmed) {
      setReplaysByLevel(prev => clearReplaysByLevel(prev, level.id));
      // Reload the level to ensure clean state
      load(levelIndex);
    }
  }, [level.id, level.name, levelIndex]);

  /**
   * Resets replay data for all levels in the current section.
   * Optionally shows a confirmation dialog before clearing.
   */
  const resetCurrentSection = useCallback((skipConfirmation = false) => {
    if (!import.meta.env.DEV) return;

    const sectionId = level.section ?? "unknown";
    const levelsInSection = LEVELS.filter(lvl => lvl.section === sectionId).length;

    const confirmed = skipConfirmation || window.confirm(
      `Reset all replay data for section "${sectionId}"?\n\nThis will clear replays for ${levelsInSection} levels.`
    );

    if (confirmed) {
      setReplaysByLevel(prev => clearReplaysBySection(prev, sectionId, LEVELS));
      // Reload current level to ensure clean state
      load(levelIndex);
    }
  }, [level.section, levelIndex]);

  /**
   * Resets all replay data across all levels.
   * Optionally shows a confirmation dialog before clearing.
   */
  const resetAllProgress = useCallback((skipConfirmation = false) => {
    if (!import.meta.env.DEV) return;

    const confirmed = skipConfirmation || window.confirm(
      `Reset ALL replay data?\n\nThis will clear replays for all ${LEVELS.length} levels.\n\nThis action cannot be undone.`
    );

    if (confirmed) {
      setReplaysByLevel(clearAllReplays());
      // Reload current level to ensure clean state
      load(levelIndex);
    }
  }, [levelIndex]);

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

  // keyboard shortcuts (disabled during replay)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isReplaying) return;

      const now = performance.now();
      if (e.key === "q" || e.key === "Q") {
        if (!selectedId) return;
        // record net run move
        const t = stateRef.current.tilesById[selectedId];
        if (t) currentRunRef.current.push({ kind: "ROTATE", at: { q: t.q, r: t.r }, dir: "CCW" });

        dispatch({ type: "MOVE", move: { kind: "ROTATE", tileId: selectedId, dir: "CCW" }, now });
      } else if (e.key === "e" || e.key === "E") {
        if (!selectedId) return;
        const t = stateRef.current.tilesById[selectedId];
        if (t) currentRunRef.current.push({ kind: "ROTATE", at: { q: t.q, r: t.r }, dir: "CW" });

        dispatch({ type: "MOVE", move: { kind: "ROTATE", tileId: selectedId, dir: "CW" }, now });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        const s = stateRef.current;
        if (s.undoStack.length === 0 || s.phase === "SETTLING" || s.phase === "SOLVED") return;

        // net run: pop last rotate
        currentRunRef.current.pop();
        dispatch({ type: "MOVE", move: { kind: "UNDO" }, now });
      } else if (e.key === "n" || e.key === "N") {
        setShowNumbers(s => !s);
      } else if (e.key === "h" || e.key === "H") {
        setShowHud(v => !v);
      } else if ((e.key === "r" || e.key === "R") && import.meta.env.DEV) {
        // DEV only: Reset current level (no confirmation for keyboard shortcut)
        resetCurrentLevel(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, isReplaying, resetCurrentLevel]);

  const scoreText = useMemo(() => {
    const moves = state.moveCount;
    const ideal = level.scoring.idealMoves;
    const two = level.scoring.twoStarMax;
    const stars = moves <= ideal ? 3 : moves <= two ? 2 : 1;
    const ascended = moves < ideal;
    return { stars, ascended, moves, ideal, two };
  }, [state.moveCount, level.scoring]);

  function rotate(dir: "CW" | "CCW") {
    if (isReplaying) return;
    if (!selectedId) return;

    const t = state.tilesById[selectedId];
    if (t) currentRunRef.current.push({ kind: "ROTATE", at: { q: t.q, r: t.r }, dir });

    dispatch({ type: "MOVE", move: { kind: "ROTATE", tileId: selectedId, dir }, now: performance.now() });
  }

  function undo() {
    if (isReplaying) return;
    if (!canUndo) return;

    // net run: pop last rotate
    currentRunRef.current.pop();
    dispatch({ type: "MOVE", move: { kind: "UNDO" }, now: performance.now() });
  }

  function retry() {
    if (isReplaying) return;
    load(levelIndex);
  }

  /**
   * Finalize latest/best recording on SOLVED edge.
   * Only records player solutions, not replay completions.
   */
  const prevSolvedRef = useRef(false);
  useEffect(() => {
    const prev = prevSolvedRef.current;
    prevSolvedRef.current = solved;

    // Only record when transitioning to solved AND not during a replay
    if (!prev && solved && !isReplaying) {
      const lvl = LEVELS[levelIndex];
      const levelId = lvl.id;
      const levelHash = computeLevelHash(lvl);
      const moves = currentRunRef.current.slice();

      const rec: Recording = {
        levelId,
        levelHash,
        createdAt: Date.now(),
        moves,
        meta: { moveCount: moves.length, source: "player" },
      };

      setReplaysByLevel(prevMap => {
        const prevSlots = prevMap[levelId] ?? {};
        const best = prevSlots.best;
        const nextBest = !best || rec.moves.length < best.moves.length ? rec : best;
        return { ...prevMap, [levelId]: { latest: rec, best: nextBest } };
      });
    }
  }, [solved, levelIndex, isReplaying]);

  /** Replay controls */
  function startReplay(mode: ReplayMode) {
    const lvl = LEVELS[levelIndex];
    const levelId = lvl.id;
    const slots = replaysByLevel[levelId];
    const recording = mode === "latest" ? slots?.latest : slots?.best;
    if (!recording) return;

    const currentHash = computeLevelHash(lvl);
    if (recording.levelId !== levelId || recording.levelHash !== currentHash) {
      setReplayStatus({ state: "error", message: "Replay is from a different version of this level." });
      return;
    }

    resetRunRecording();
    setSelectedId(null);

    // New run id to invalidate stale timers
    const runId = ++replayRunIdRef.current;
    replayCtrlRef.current = { recording, index: 0, speedMs: replaySpeedMs, runId };

    // UI state: show loading (optional) or jump straight to playing UI
    setReplayStatus({ state: "loading", recording, index: 0, speedMs: replaySpeedMs });

    // Reset/load canonical initial state
    load(levelIndex);
  }

  /**
   * Stops the currently running replay and returns to idle state.
   * Clears the replay controller reference and resets UI state.
   */
  function stopReplay() {
    replayCtrlRef.current = null;
    setReplayStatus({ state: "idle" });
  }

  // Replay driver: phase-driven stepping, with speed delay
  useEffect(() => {
    const ctrl = replayCtrlRef.current;
    if (!ctrl) return;

    const { recording, speedMs, runId } = ctrl;

    // Gate: wait for correct level + not settling
    if (state.levelId !== recording.levelId) return;
    if (state.phase === "SETTLING") return;

    // If level is already solved, finish immediately
    if (state.phase === "SOLVED") {
      replayCtrlRef.current = null;
      setReplayStatus({ state: "done", recording });
      return;
    }

    // If we're still showing loading in UI, flip to playing UI once we're ready.
    // This is the only synchronous set here, but it happens at most once per run
    // and isn't a state-machine loop anymore.
    if (replayStatus.state === "loading") {
      setReplayStatus({ state: "playing", recording, index: ctrl.index, speedMs });
    }

    // If we're done, finish
    if (ctrl.index >= recording.moves.length) {
      replayCtrlRef.current = null;
      setReplayStatus({ state: "done", recording });
      return;
    }

    const handle = window.setTimeout(() => {
      const liveCtrl = replayCtrlRef.current;
      if (!liveCtrl) return;
      if (liveCtrl.runId !== runId) return; // stale timer

      const s = stateRef.current;

      // Respect settling/solved at execution time too
      if (s.phase === "SETTLING") return;
      if (s.phase === "SOLVED") {
        replayCtrlRef.current = null;
        setReplayStatus({ state: "done", recording });
        return;
      }

      // Check done again
      if (liveCtrl.index >= recording.moves.length) {
        replayCtrlRef.current = null;
        setReplayStatus({ state: "done", recording });
        return;
      }

      const m = recording.moves[liveCtrl.index];
      const { q, r } = m.at;

      if (!canRotateAt(s, q, r)) {
        replayCtrlRef.current = null;
        setReplayStatus({ state: "error", message: `Invalid replay move at (${q},${r})` });
        return;
      }

      const tileId = tileIdAt(s, q, r);
      if (!tileId) {
        replayCtrlRef.current = null;
        setReplayStatus({ state: "error", message: `No tile at (${q},${r})` });
        return;
      }

      dispatch({
        type: "MOVE",
        move: { kind: "ROTATE", tileId, dir: m.dir },
        now: performance.now(),
      });

      // Advance controller index (no render yet)
      liveCtrl.index += 1;

      // Update UI (this is a single state update per move)
      setReplayStatus({ state: "playing", recording, index: liveCtrl.index, speedMs: liveCtrl.speedMs });
    }, speedMs);

    return () => window.clearTimeout(handle);
  }, [state.levelId, state.phase, replayStatus.state]);

  // Disable selection during replay
  const setSelectedIdSafe = (id: string | null) => {
    if (isReplaying) return;
    setSelectedId(id);
  };

  const currentLevelId = level.id;
  const currentSlots = replaysByLevel[currentLevelId] ?? {};
  const hasLatest = !!currentSlots.latest;
  const hasBest = !!currentSlots.best;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 16,
        padding: 16,
        minHeight: "100vh",
        background: "#0b0f14",
        color: "white",
        fontFamily: "system-ui, sans-serif",
      }}
    >
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
          setSelectedId={setSelectedIdSafe}
          showNumbers={showNumbers}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={() => rotate("CCW")} disabled={!canRotate}>
            Rotate ⟲ (Q)
          </button>
          <button onClick={() => rotate("CW")} disabled={!canRotate}>
            Rotate ⟳ (E)
          </button>
          <button onClick={undo} disabled={!canUndo}>
            Undo (Ctrl/Cmd+Z)
          </button>
          <button onClick={retry} disabled={state.phase === "SETTLING" || isReplaying}>
            Retry
          </button>
          <button onClick={() => setShowNumbers(v => !v)} style={{ marginLeft: "auto" }} disabled={isReplaying}>
            {showNumbers ? "Hide" : "Show"} Pressure Insight (N)
          </button>
        </div>

        {isReplaying && (
          <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
            Replay active — input disabled
          </div>
        )}

        {solved && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 650 }}>
                Solved{" "}
                <span style={{ display: "inline-flex", gap: 2, marginLeft: 6 }}>
                  {[1, 2, 3].map((s) => (
                    <span
                      key={s}
                      style={{
                        opacity: s <= scoreText.stars ? 1 : 0.25,
                        color: scoreText.ascended ? "#ff4fd8" : "#f4c542",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </span>
              </div>
              <div style={{ opacity: 0.8 }}>
                {scoreText.moves} moves (ideal {scoreText.ideal}, 2★ ≤ {scoreText.two})
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => load(Math.max(0, levelIndex - 1))} disabled={levelIndex <= 0 || isReplaying}>
                  Back
                </button>
                <button
                  onClick={() => load(Math.min(LEVELS.length - 1, levelIndex + 1))}
                  disabled={levelIndex >= LEVELS.length - 1 || isReplaying}
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

            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => resetCurrentLevel()} style={{ fontSize: 11, padding: "4px 8px" }}>
                Reset Level (R)
              </button>
              <button onClick={() => resetCurrentSection()} style={{ fontSize: 11, padding: "4px 8px" }}>
                Reset Section "{level.section ?? 'unknown'}"
              </button>
              <button onClick={() => resetAllProgress()} style={{ fontSize: 11, padding: "4px 8px" }}>
                Reset All Progress
              </button>
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
                      <span style={{ opacity: 0.85 }}>{d?.pressure ?? 0}/{lim}</span>{" "}
                      <span style={{ opacity: 0.7 }}>{d?.state ?? "?"} • o{t.orient}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div style={{ fontWeight: 650, marginBottom: 10 }}>Levels</div>
        <div style={{ display: "grid", gap: 10 }}>
          {Object.entries(levelsBySection.groups).map(([sectionName, levelsInSection]) => {
            const isExpanded = expandedSections.has(sectionName);
            const stats = getSectionStats(sectionName);
            const unlockStatus = isSectionUnlocked(sectionName);
            const isLocked = !unlockStatus.unlocked;

            return (
              <div key={sectionName} style={{ display: "grid", gap: 6 }}>
                {/* Section header (accordion toggle) */}
                <div style={{ display: "grid", gap: 4 }}>
                  <button
                    onClick={() => toggleSection(sectionName)}
                    disabled={isReplaying}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: isLocked ? "1px solid rgba(255,100,100,0.25)" : "1px solid rgba(255,255,255,0.18)",
                      background: isLocked ? "rgba(255,100,100,0.05)" : "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      fontWeight: 600,
                      opacity: isLocked ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, opacity: 0.8 }}>
                        {isLocked ? "🔒" : (isExpanded ? "▼" : "▶")}
                      </span>
                      <span>{sectionName}</span>
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.75 }}>
                      {stats.earnedStars} / {stats.maxStars} ★
                    </div>
                  </button>

                  {/* Lock message */}
                  {isLocked && (
                    <div style={{
                      fontSize: 11,
                      opacity: 0.7,
                      paddingLeft: 36,
                      lineHeight: 1.3,
                    }}>
                      {unlockStatus.reason}
                    </div>
                  )}
                </div>

                {/* Level list (shown when expanded and unlocked) */}
                {isExpanded && !isLocked && (
                  <div style={{ display: "grid", gap: 6, paddingLeft: 8 }}>
                    {levelsInSection.map(({ level: l, index: i }) => (
                      <button
                        key={l.id}
                        onClick={() => load(i)}
                        disabled={isReplaying}
                        style={{
                          textAlign: "left",
                          padding: "10px 10px",
                          borderRadius: 10,
                          border: i === levelIndex ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
                          background: i === levelIndex ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {l.name}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>{l.id}</div>
                        </div>

                        {(() => {
                          const stars = starsForLevel(l.id, l.scoring.idealMoves, l.scoring.twoStarMax);
                          if (stars == null) return null;

                          return (
                            <div style={{ display: "inline-flex", gap: 2, flexShrink: 0 }}>
                              {[1, 2, 3].map((s) => (
                                <span
                                  key={s}
                                  style={{
                                    opacity: s <= stars ? 1 : 0.25,
                                    color: "#f4c542",
                                    fontSize: 14,
                                    lineHeight: 1,
                                  }}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </button>
                    ))}
                  </div>
                )}

                {/* Show locked placeholder when expanded but locked */}
                {isExpanded && isLocked && (
                  <div style={{
                    paddingLeft: 8,
                    fontSize: 13,
                    opacity: 0.5,
                    fontStyle: "italic",
                    padding: "10px",
                  }}>
                    {levelsInSection.length} level{levelsInSection.length !== 1 ? 's' : ''} locked
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Replay controls */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 650, marginBottom: 8 }}>Replay</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => startReplay("latest")} disabled={isReplaying || !hasLatest}>
              Replay Latest
            </button>
            <button onClick={() => startReplay("best")} disabled={isReplaying || !hasBest}>
              Replay Best
            </button>
            <button onClick={stopReplay} disabled={!isReplaying}>
              Stop
            </button>

            <select
              value={replaySpeedMs}
              disabled={isReplaying}
              onChange={e => setReplaySpeedMs(Number(e.target.value))}
              style={{
                color: "white",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "8px 10px",
              }}
            >
              <option value={60}>Fast</option>
              <option value={120}>Normal</option>
              <option value={240}>Slow</option>
            </select>
          </div>

          {replayStatus.state === "playing" && (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Move {replayStatus.index} / {replayStatus.recording.moves.length}
            </div>
          )}
          {replayStatus.state === "done" && (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Done
            </div>
          )}
          {replayStatus.state === "error" && (
            <div style={{ marginTop: 8, fontSize: 12, color: "crimson" }}>
              {replayStatus.message}
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
            <div><b>Controls</b></div>
            <div>Click tile to select</div>
            <div>Q / E rotate</div>
            <div>Ctrl/Cmd+Z undo</div>
            <div>N toggles numbers</div>
          </div>
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
