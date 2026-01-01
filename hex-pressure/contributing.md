# Contributing to Hex Pressure

This project lives in `hex-pressure/` inside a larger repository.
All changes should be scoped to this directory unless explicitly requested.

## Setup

`cd hex-pressure`<br>
`npm install`

## Development
Runs the Vite dev server.

`npm run dev`

## Tests
Runs engine-only tests (Vitest).

`npm test`

## Guidelines

* Follow rules documented in `DESIGN.md`
* Check `ROADMAP.md` before introducing new mechanics
* Prefer small, reviewable changes
* Engine changes should include or update tests
* UI/Canvas changes do not require tests (for now)

## Notes for Automation

* Do not modify files outside `hex-pressure/`
* Do not change core mechanics without updating `DESIGN.md`