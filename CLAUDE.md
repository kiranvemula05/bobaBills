# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A React 19 + Pixi.js v8 casino slot prototype (currently a single game, "Sugar Rush Inspired" — 7×7 cluster-pays with cascading wins, multipliers, and free spins). The game is a fully Pixi-rendered HUD mounted inside a single `<Application>` canvas letterboxed into the 1280×720 stage.

## Commands

- `npm run dev` — Vite dev server (port defaults shown in terminal).
- `npm run build` — production bundle into `dist/`.
- `npm run preview` — serve the built bundle.

There is no test runner, linter, or formatter configured. CI does not exist. `node_modules/` and `dist/` are the standard ignores; the project ships its own `src/node_modules/` shadow copy that mirrors the root one — when reading paths in this repo prefer `node_modules/...` (or `src/node_modules/...` for the shadow) consistently.

## Architecture

Single-Pixi-canvas architecture. There is **no React-DOM game UI**; every on-screen element you see is rendered through Pixi inside the single `<Application>` mounted from `src/app.jsx`. React only wraps the canvas in `index.html`; HUD chrome (TopBar, BetPanel, SpinButton, Background, …) is JSX that compiles down to Pixi containers/sprites via `@pixi/react`.

Layered as:

- `index.html` — centers the Pixi `<canvas>` inside `#root`, letterboxed to 1280×720.
- `src/main.jsx` — `<StrictMode>` + `<Suspense fallback={<LoadingScreen />}>` around `<App />`.
- `src/app.jsx` (`HUD` → `PixiStage`) — the only `<Application>` for the whole game. Children rendered as `<pixiContainer>` JSX (Pixi v8 custom elements registered via `extend({ Container, Sprite, Text, Graphics })`). Top-level HUD mounts here: `Background`, `BoardFrame`, `PixiGrid`, `PixiOverlay`, `PixiEffects`, `TopBar`, `GameLogo`, `GameMessage`, `SpinButton`, `BetPanel`, `SettingsButton`, `SoundButton`, `BalancePanel`, `AutoSpinButton`, `PaytableButton`, `SettingsPopup`, `PaytablePopup`, `AutoSpinPopup`.
- `src/pixi/*` — every JSX child of `<Application>`. Each file is one Pixi component (`SymbolSprite`, `PixiGrid`, `TopBar`, …). Coordinate system is shared: 1280×720 with the play column (BoardFrame + 7×7 grid) centred on x=640.
- `src/games/suger-rush/*` — the single registered game. `config.js` is the **single source of truth** for the game: grid size, symbol set, RNG weights, free-spin awards, paytable, animation timings (with `autoSpin` overrides), audio entries, asset URLs, and the entire `layout.*` tree (HUD positions, HUD sizes, button geometry, panel geometry). `index.js` side-effect-registers the game with `AssetRegistry` before `useGameAssets()` runs.
- `src/engine/*` — the slot engine, all class-based. `SlotEngine` is a **singleton façade**; UI imports the default export and never touches `SpinManager` directly. Engines emit a fixed set of events; UI listens via `useEventBusEffect` and pushes into the Zustand store.
- `src/store/gameStore.js` — Zustand store (slices for game state, hold-and-win). Components read state from the store and mutate only via the exported setters.
- `src/loaders/*` — `Preloader.js` (shared Pixi `Assets` instance, exposes `subscribeProgress`), `AssetRegistry.js` (per-game asset map; games call `register(gameId, config)` at module load), `AssetManifest.js`.
- `src/hooks/*` — `useEventBus` / `useEventBusEffect` (subscribe to `engine/EventBus.js`), `useGameAssets` (suspends via React 19 `use()` until the active game's bundle is loaded — pair with `<Suspense fallback={<LoadingScreen />}>`), `useAssets`, `usePreloaderProgress`.
- `src/components/*` — DOM/React-DOM chrome that lives **outside** the Pixi canvas: `LoadingScreen`, `PreloadBoundary`, popup overlays (`SettingsPopup`, `PaytablePopup`, `AutoSpinPopup`), display components (`WinDisplay`, `FreeSpinDisplay`, `JackpotDisplay`, `BonusDisplay`), `BackgroundMusic`, `ButtonSound`, `audioBus`. The HUD-in-Pixi components (`GameLogo`, `PaytablePopup`, `AutoSpinPopup`, `SettingsPopup`) sit in **both** folders — keep them straight; the Pixi one is what mounts inside `<Application>`.
- `public/assets/...` — all static art and audio; URLs in `config.js` are site-rooted (`/assets/...`) so they work in both `npm run dev` and the production build without `fs.allow` entries.

### Event flow

`SlotEngine.spin()` → `SpinManager` emits `SPIN_START`/`SPIN_COMPLETE`/`WIN_CALCULATED`/`WIN_COMPLETE`/`BONUS_TRIGGERED`/`JACKPOT_WON`/`AUTO_SPIN_*`. The `app.jsx` `HUD` listens side-effect-only via `useEventBusEffect` and pushes into Zustand; never force a HUD re-render on each emit (caused a cascade-loop render storm in the past).

### Animation timings

`games/suger-rush/config.js#animation` holds two parallel blocks: `reelSpin` / `cascadeDuration` / `spinDuration` for manual spins, mirrored under `animation.autoSpin` for runs. `SpinManager.startSpin` and `SymbolSprite` resolve via `autoSpin override → animation root → fallback`. Edit there rather than in engine code.

### Important conventions

- Stage is fixed 1280×720; everything is positioned absolutely via `config.layout`. Don't read viewport sizes inside Pixi components.
- React components that mount inside `<Application>` must use the Pixi custom elements (`<pixiContainer>`, `<pixiSprite>`, `<pixiText>`, `<pixiGraphics>`); plain DOM tags are stripped by `@pixi/react`.
- `useEventBus` is currently a no-op (subscribed but the body is commented out). Use `useEventBusEffect` for side-effect listeners and direct store setters for state updates — do not rely on `useEventBus` re-renders.
- The Pixi `<Application>` and the React reconciler share React instances; `vite.config.js` `resolve.dedupe` for `react` / `react-dom` is load-bearing — dropping it surfaces as `Invalid hook call` inside Pixi children.
- Button ids for `ButtonSound.play(id)`: `default`, `spin`, `lobby`, `paytable`, `settings`, `sound`, `autoSpin`, `betPlus`, `betMinus`. Missing keys fall through to `default`; set any entry's `enabled: false` to silence it.
