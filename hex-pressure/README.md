# Hex-Pressure

A puzzle game about managing pressure on a hexagonal grid. Rotate directional tiles to stabilize the grid and solve increasingly complex spatial reasoning challenges.

## Game Concept

In Hex-Pressure, tiles exert "pressure" on their neighbors. **Directional tiles** only count neighbors in specific directions based on their orientation. Your goal is to rotate tiles until the entire grid is stable (no tile exceeds its pressure limit).

### Tile Types

- **NEUTRAL** - Counts all adjacent neighbors (non-rotatable, high limits)
- **DIRECTIONAL** - Only counts neighbors in 3 consecutive hex directions (60° cone)
- **SINK** - Always stable, acts as a "safe" neighbor for testing dense configurations
- **ANCHOR** *(planned)* - Future tile type for advanced mechanics

### Controls

- **Q/E** - Rotate selected tile counter-clockwise/clockwise
- **U** - Undo last move
- **N** - Toggle pressure numbers display
- **H** - Toggle Dev HUD (shows tile states, phase, move count)
- **R** *(DEV only)* - Reset current level progress

## Getting Started

### Prerequisites

- **Node.js** 18+ (recommend latest LTS)
- **npm** or compatible package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/Jordst3r/playground.git
cd playground/hex-pressure

# Install dependencies
npm install
```

### Development

```bash
# Start dev server with hot reload
npm run dev

# Visit http://localhost:5173 in your browser
```

The development build includes:
- Dev HUD (toggle with `H` key)
- Tile ID labels for debugging
- Reset controls for testing
- Solver validation in console

### Building for Production

```bash
# Run TypeScript compiler and build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

Production builds exclude all DEV-only features (debug labels, reset controls, console logs).

### Testing

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Lint code
npm run lint
```

**Test Coverage:**
- Engine mechanics (rotation, pressure calculation, undo)
- Solver (BFS optimal solution finding)
- Replay system (recording and playback)

Currently: **14 tests passing** ✓

## Project Structure

```
hex-pressure/
├── src/
│   ├── engine/          # Core game logic
│   │   ├── engine.ts    # Game state, moves, pressure calculation
│   │   ├── hex.ts       # Hexagonal grid math (axial coordinates)
│   │   ├── levels.ts    # Level definitions
│   │   ├── replay.ts    # Recording/playback system
│   │   ├── solver.ts    # BFS solver for optimal solutions
│   │   ├── storage.ts   # localStorage persistence
│   │   ├── types.ts     # TypeScript type definitions
│   │   └── validate.ts  # Level solvability validation
│   ├── ui/
│   │   └── CanvasBoard.tsx  # Canvas-based hex grid renderer
│   ├── App.tsx          # Main React component
│   └── main.tsx         # Entry point
├── notes/               # Design docs, roadmap, changelog
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Features

### ✅ Implemented (MVP)

- **5 Tutorial Levels** - "intro" section teaching core mechanics
- **Rotation-Only Gameplay** - Solve puzzles by rotating directional tiles
- **3-Star Scoring** - Ideal moves, 2-star threshold, completion star
- **Replay System** - Records and replays solutions (best & latest)
- **localStorage Persistence** - Progress saved across sessions
- **Undo System** - Full move history with undo support
- **BFS Solver** - Validates levels are solvable, computes optimal solutions
- **DEV Tools** - Reset controls, tile state visualization, solver diagnostics

### 🚧 Planned Features

See [notes/roadmap.md](notes/roadmap.md) for detailed roadmap.

**Short-term:**
- Additional level sections (currently 1 of 5+ planned)
- Polish pass (animations, audio, particle effects)
- Mobile/touch support

**Medium-term:**
- MOVE mechanic (slide tiles to adjacent cells)
- Campaign progression & meta-game
- Level editor

**Long-term:**
- New tile types (ANCHOR, others TBD)
- Steam release considerations

## Contributing

Interested in contributing? Check out [notes/contributing.md](notes/contributing.md) for:
- Code style guidelines
- PR workflow
- Testing requirements
- Level design principles

### Playtesting

If you're here to playtest:
1. Follow installation steps above
2. Run `npm run dev`
3. Play through the 5 intro levels
4. Report bugs or feedback via GitHub Issues

**Things to test:**
- Can you solve all levels?
- Are any puzzles confusing or unclear?
- Performance issues on your device?
- UI/UX friction points?

## Technology Stack

- **React 19** - UI framework
- **TypeScript 5.9** - Type safety
- **Vite 7** - Build tool & dev server
- **Vitest 4** - Unit testing
- **Canvas API** - Hex grid rendering
- **localStorage** - Progress persistence

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ Free to use, modify, and distribute
- ✅ Can be used in commercial projects
- ✅ No warranty provided
- ⚠️ Must include original copyright notice in copies

## Changelog

See [notes/CHANGELOG.md](notes/CHANGELOG.md) for detailed change history.

## Credits

**Development:** Jordi Ensign (with AI pair-programming assistance from Claude Code, ChatGPT)

**Inspiration:** Hexagonal puzzle games, spatial reasoning mechanics, minimalist design principles
