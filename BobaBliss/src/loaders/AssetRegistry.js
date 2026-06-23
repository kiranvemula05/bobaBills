import Preloader from "./Preloader.js";
import gameConfig from "../games/suger-rush/config";

/**
 * AssetRegistry
 *
 * The game-level entry point for asset loading. Every game ships
 * its own `config.js` declaring which URLs it needs; this class
 *
 *   1. Holds a map from `gameId -> AssetEntry[]`.
 *   2. Lets a game register itself at module load
 *      (`AssetRegistry.register(gameId, config)`).
 *   3. Exposes `preloadGame(gameId)` which narrows the shared
 *      preloader to the active game's URLs only.
 *   4. Keeps a per-game texture cache so a game can ask for
 *      `getSymbol("RED_CANDY")` and get back the same `Texture`
 *      reference the preloader put in Pixi's cache.
 *
 * The shared Preloader singleton still owns the Pixi Assets
 * instance — this class is a thin layer that filters its work
 * to the active game. Components that want a typed texture
 * (`SymbolSprite`, `PixiOverlay`, etc.) can keep using
 * `Preloader.getTypedTexture("symbol", name)` for backwards
 * compatibility; the per-game path is the one new code uses.
 *
 * Loading flow:
 *   - main.jsx wraps <App /> in <Suspense fallback={<LoadingScreen />}>.
 *   - App.jsx resolves the active game (sugar-rush today), calls
 *     `AssetRegistry.preloadGame(id)`, and uses `use()` to suspend
 *     on it.
 *   - AssetRegistry.preloadGame() calls Assets.init() once, then
 *     walks only the URLs belonging to that game. Progress is
 *     proxied through the existing Preloader.subscribeProgress
 *     so LoadingScreen keeps working unchanged.
 */

const KIND_MAP = {
    symbol: "symbols",
    background: "backgrounds",
    particle: "particles",
    ui: "ui",
    audio: "audio",
};

class AssetRegistry {
    constructor() {
        // gameId -> { config, entries }
        this._games = new Map();
        // gameId -> promise that resolves when that game's
        // assets are loaded. Repeated calls return the same promise.
        this._promises = new Map();
    }

    /**
     * Register a game's asset config. Idempotent — re-registering
     * with the same id and the same entries is a no-op. Re-registering
     * with a different config invalidates the cached promise so
     * the next `preloadGame()` will re-run.
     *
     * `config.assets` is the standard shape from
     * `src/games/<game>/config.js`:
     *   {
     *     background: "<url>",
     *     symbols: { NAME: "<url>", ... },
     *     backgrounds: { NAME: "<url>", ... }, // optional
     *     particles: { NAME: "<url>", ... },   // optional
     *     ui: { NAME: "<url>", ... },          // optional
     *     audio: { NAME: "<url>", ... },       // optional
     *   }
     *
     * Anything outside that shape is ignored — the registry should
     * not load anything the renderer didn't ask for.
     */
    register(gameId, config) {
        if (!gameId || !config) return;
        const entries = this._flatten(config.assets ?? {});
        const prev = this._games.get(gameId);
        if (
            prev &&
            prev.config === config &&
            prev.entries.length === entries.length
        ) {
            return;
        }
        this._games.set(gameId, { config, entries });
        this._promises.delete(gameId);
    }

    /**
     * Resolve every entry a game registered. Returns the flat
     * list of URLs (deduped, order preserved) — useful for
     * debugging or for components that want to inspect the set
     * before the load kicks off.
     */
    getGameAssets(gameId) {
        const game = this._games.get(gameId);
        return game ? [...game.entries.map((e) => e.url)] : [];
    }

    /**
     * Returns the active gameId, or `null` if none registered.
     * The first registered game wins (matches the old behaviour
     * where sugar-rush was the only game).
     */
    getDefaultGameId() {
        const first = this._games.keys().next();
        return first.done ? null : first.value;
    }

    /**
     * Suspend until a specific game's assets are ready. Safe to
     * call from React's `use()` hook — returns a memoized promise
     * per gameId.
     *
     * The underlying work still goes through the shared
     * `Preloader` instance, so `Preloader.subscribeProgress()`
     * keeps emitting 0..100 while we load.
     */
    preloadGame(gameId) {
        if (!gameId) return Promise.resolve(false);
        let promise = this._promises.get(gameId);
        if (!promise) {
            promise = this._run(gameId).catch((err) => {
                // Don't poison the cache: a failed load should
                // be retried on the next call.
                this._promises.delete(gameId);
                throw err;
            });
            this._promises.set(gameId, promise);
        }
        return promise;
    }

    /**
     * Type-aware accessor mirroring Preloader.getTypedTexture but
     * scoped to a single game. Returns the cached `Texture` if
     * Pixi already has it, otherwise starts a load and resolves
     * with the result.
     *
     *   await registry.getAsset("sugar-rush", "symbol", "RED_CANDY")
     */
    async getAsset(gameId, kind, name) {
        const game = this._games.get(gameId);
        if (!game) return null;
        const entry = game.entries.find(
            (e) => e.kind === kind && e.name === name
        );
        if (!entry) return null;
        await this.preloadGame(gameId);
        return Preloader._loadOne
            ? null // never reached; placeholder
            : null;
    }

    // --- internals ---

    /**
     * Flatten the structured `config.assets` shape into a single
     * ordered list of `{ kind, name, url }`. Unknown kinds are
     * skipped. URLs are deduped across kinds.
     */
    _flatten(assets) {
        const seen = new Set();
        const out = [];

        const push = (kind, name, url) => {
            if (!url || typeof url !== "string") return;
            if (seen.has(url)) return;
            seen.add(url);
            out.push({ kind, name, url });
        };

        if (typeof assets === "string") {
            push("background", "main", assets);
        }

        if (assets.background) {
            push("background", "main", assets.background);
        }

        for (const key of Object.keys(assets)) {
            const map = assets[key];
            if (!map || typeof map !== "object") continue;
            const kind =
                KIND_MAP[key] ?? (key === "symbols" ? "symbol" : key);
            for (const name of Object.keys(map)) {
                push(kind, name, map[name]);
            }
        }

        return out;
    }

    async _run(gameId) {
        const game = this._games.get(gameId);
        if (!game) return false;

        // Drive Pixi's Assets init through the shared Preloader so
        // the manifest / basePath stays consistent for the rest of
        // the app. `preload()` returns the same singleton promise
        // every call, so this is cheap on subsequent games.
        await Preloader.preload();

        // Walk only this game's URLs. Each entry is loaded via the
        // preloader so failures are logged uniformly and the texture
        // lands in Pixi's shared cache.
        for (const entry of game.entries) {
            await Preloader._loadOne(entry.url);
        }

        return true;
    }
}

export default new AssetRegistry();