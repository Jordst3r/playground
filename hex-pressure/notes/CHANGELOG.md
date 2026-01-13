# Hex-Pressure Changelog

All notable changes to this project will be documented in this file.

---

## 2026-01-13

### Added
- **Accordion-Style Section Organization**
  - Implemented collapsible section headers for level organization
  - Section headers show expand/collapse arrows (▶ collapsed, ▼ expanded)
  - Each section displays progress: earned stars / max stars (e.g., "12 / 15 ★")
  - Introduction section starts expanded by default
  - Levels are nested under section headers with visual indentation
  - Improved level navigation with progressive disclosure

- **Section Locking System with Configurable Thresholds**
  - Added `unlockThreshold` property to `LevelDef` type (percentage 0-100)
  - Threshold is configurable per section and defaults to 80%
  - First section (Introduction) is always unlocked
  - Subsequent sections require completion percentage of previous section
  - Locked sections display 🔒 lock icon and red-tinted styling
  - Clear unlock requirements shown: "Complete 80% of Introduction (12/15 ★) to unlock"
  - Locked sections can be expanded to preview content but levels are unplayable
  - Shows "5 levels locked" placeholder message for locked sections

- **Second Level Section: Foundations**
  - Added 5 new levels (w2-01 through w2-05) mirroring Introduction section
  - Reinforces core rotation mechanics with identical puzzle configurations
  - Section requires 80% completion (12/15 stars) of Introduction to unlock
  - Total game content expanded from 5 to 10 levels

- **Enhanced Section Statistics**
  - Real-time completion percentage calculation per section
  - Automatic unlock status updates as progress is made
  - Section metadata tracking with order preservation

- **Comprehensive Test Suite for Progression System**
  - Created new `progression.ts` module with testable utility functions
  - Created new `scoring.ts` module for star calculation logic
  - Added `progression.test.ts` with 18 comprehensive tests
  - Tests cover section grouping, statistics calculation, and unlock logic
  - Total test count increased from 14 to 32 tests
  - All tests passing with full type safety

### Changed
- **Level Section Names**
  - Renamed section identifier from `"intro"` to `"Introduction"` for consistency
  - More formal, user-friendly section naming convention
  - Updated all 5 Introduction levels with new section name

- **UI Layout Improvements**
  - Section headers now more prominent with distinct styling
  - Better visual hierarchy between sections and levels
  - Locked sections have reduced opacity (0.6) and warning colors
  - Star progress always visible even for locked sections

### Technical Details
- Section locking logic implemented with `getSectionStats()` and `isSectionUnlocked()` callbacks
- `starsForLevel` function wrapped in `useCallback` for React optimization
- Section order tracked in `levelsBySection` memoized structure
- Lock status checked against previous section's completion percentage
- Default threshold of 80% applied when `unlockThreshold` not specified
- Progression logic refactored into pure, testable utility functions
- Scoring logic extracted to dedicated module for reusability

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
