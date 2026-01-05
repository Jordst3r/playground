# Hex-Pressure Changelog

All notable changes to this project will be documented in this file.

---

## 2026-01-05

### Added
- **MIT License**
  - Created `LICENSE` file with standard MIT License text
  - Updated README.md with license information and user-friendly explanation
  - Updated package.json with license, author, description, and repository fields
  - Project is now officially open-source under permissive MIT License

---

## 2026-01-03

### Added
- **localStorage Persistence for Replays**
  - Created new `storage.ts` module with comprehensive JSDoc documentation
  - Implements `loadReplays()`, `saveReplays()`, and `clearReplays()` functions
  - Includes version checking to handle incompatible storage formats gracefully
  - Error recovery with try-catch blocks for quota exceeded/private mode scenarios
  - Replays now persist across page reloads
  - Integrated storage module into `App.tsx` with automatic save on state changes

- **DEV Reset Controls (Testing/Development)**
  - Added section metadata to `LevelDef` type for grouping levels
  - All 5 intro levels now tagged with `section: "intro"`
  - Implemented granular reset functions in `storage.ts`:
    - `clearReplaysByLevel()` - Reset single level
    - `clearReplaysBySection()` - Reset all levels in a section
    - `clearAllReplays()` - Reset all progress
  - Added keyboard shortcut: **R** key resets current level (DEV only, no confirmation)
  - Added Dev HUD controls (toggle with H key):
    - "Reset Level (R)" button with confirmation dialog
    - "Reset Section" button with confirmation dialog showing level count
    - "Reset All Progress" button with strong confirmation warning
  - Confirmation dialogs can be bypassed (for automated testing) via `skipConfirmation` parameter
  - All reset functions reload the current level to ensure clean state
  - Console logging for all reset operations

- **Project Analysis Report**
  - Created comprehensive `ANALYSIS-REPORT.md` documenting project health
  - Covers design clarity, security analysis, code hygiene, architecture assessment
  - Includes prioritized recommendations for future work
  - Overall project health score: 8.8/10

- **Documentation Organization**
  - Created `notes/` folder for project documentation
  - Moved all markdown files (except README) into notes folder
  - Better organization for design docs, roadmap, contributing guide, and reports

### Fixed
- **ESLint Error in CanvasBoard.tsx**
  - Removed unused import `k` (alias for `key` function from hex.ts)
  - Build now passes ESLint checks cleanly

- **Performance Issue in CanvasBoard.tsx**
  - Removed redundant `requestAnimationFrame` loop (lines 138-156)
  - Eliminated unnecessary CPU churn
  - Parent `App` component already handles animation ticking

- **Code Formatting in App.tsx**
  - Fixed inconsistent indentation in `stopReplay()` function (lines 295-302)
  - Added JSDoc documentation for clarity
  - Improved code readability and consistency

- **Debug Rendering in CanvasBoard.tsx**
  - Made tile ID labels conditional on DEV mode using `import.meta.env.DEV`
  - Prevents debug labels from appearing in production builds
  - Cleaner user experience while maintaining developer diagnostics

- **Replay System Bug (Critical)**
  - Fixed bug where subsequent replay attempts would overwrite saved replays with empty recordings
  - Root cause: Recording finalization effect was firing during replay completion, creating 0-move recordings
  - Solution: Added `!isReplaying` check to recording finalization effect (line 248)
  - Replays now work correctly on multiple attempts without data loss
  - Added JSDoc documentation to clarify recording behavior

### Changed
- **Code Hygiene Improvements**
  - Added JSDoc comments to all new storage module exports
  - Added JSDoc documentation to `stopReplay()` function
  - Maintained strict TypeScript compliance
  - All 14 tests continue to pass
  - Build passes cleanly with no warnings
  - Production bundle size slightly reduced (debug labels excluded)

### Technical Details
- Storage uses FNV-1a 32-bit hash for level versioning
- Replay recordings include levelId, levelHash, createdAt, moves, and metadata
- Version 1 of storage format (for future migration compatibility)
- Proper cleanup and error boundaries for localStorage failures

---

## Previous Work (Before Changelog)

### 2026-01-02
- Day two updates: added replay system, solver, level validation
- Updated UI to show stars on level buttons
- Fixed various bugs: star coloring, undo disabling, input gating
- Added comprehensive test coverage (14 tests)

### 2026-01-01
- Created project design, roadmap, and contributing documentation
- Initial commit of hex-pressure files
- Established core game mechanics and engine architecture
