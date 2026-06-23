import { Assets } from "pixi.js";
import {
    ASSETS,
    BUNDLES,
    SYMBOLS,
    BACKGROUNDS,
    PARTICLES,
    UI,
} from "./AssetManifest.js";

/**
 * Preloader
 *
 * The game's single entry point for loading every asset the
 * renderer needs. It:
 *
 *   1. Initializes Pixi's Assets with `/assets/manifest.json`.
 *   2. Walks `BUNDLES` in order, calling `Assets.loadBundle`
 *      for each. Failed bundles are skipped (typical in dev
 *      when the manifest is small).
 *   3. Walks the flat `ASSETS` list and loads each URL,
 *      advancing the progress bar from 0..100.
 *   4. Reports progress via a subscribe API so the LoadingScreen
 *      can show a real progress bar.
 *
 * The preloader is a singleton. Calling `preload()` more than
 * once returns the same promise.
 *
 * It also exposes typed texture getters for the rest of the
 * game: `getSymbolTexture("RED_CANDY")` returns the loaded
 * `Texture` (or `null` if not yet loaded) and waits lazily
 * if the preloader is still running.
 */
class Preloader {
    constructor() {
        this._promise = null;
        this._listeners = new Set();
        this._progress = 0;
        this._phase = "idle"; // "idle" | "manifest" | "bundles" | "assets" | "done"
        this._textures = {};
    }

    // --- public API ---

    /**
     * Subscribe to progress updates (0..100). The callback is
     * called once immediately with the current value, then on
     * every update. Returns an unsubscribe function.
     */
    subscribeProgress(cb) {
        this._listeners.add(cb);
        cb(this._progress, this._phase);
        return () => this._listeners.delete(cb);
    }

    getProgress() {
        return this._progress;
    }

    getPhase() {
        return this._phase;
    }

    /**
     * Returns a memoized promise that resolves when everything
     * is loaded. Safe to call from React's `use()` hook.
     */
    preload() {
        if (!this._promise) {
            this._promise = this._run();
        }
        return this._promise;
    }

    /**
     * Wait for a specific asset to be ready. Resolves with the
     * `Texture` (or `null` on failure).
     */
    async waitForAsset(url) {
        await this.preload();
        return this._loadOne(url);
    }

    /**
     * Look up a typed texture from one of the asset maps.
     *   getTypedTexture("symbol", "RED_CANDY")
     *   getTypedTexture("background", "game")
     *   getTypedTexture("particle", "glow")
     *   getTypedTexture("ui", "logo")
     *
     * Returns the texture if it's already in the cache,
     * otherwise starts loading it and resolves with the result.
     */
    async getTypedTexture(kind, name) {
        const map = {
            symbol: SYMBOLS,
            backgrounds: BACKGROUNDS,
            particle: PARTICLES,
            ui: UI,
        }[kind];
        const url = map?.[name];
        if (!url) return null;
        return this.waitForAsset(url);
    }

    // --- internals ---

    _setPhase(phase) {
        this._phase = phase;
        this._listeners.forEach((cb) => cb(this._progress, phase));
    }

    _setProgress(p) {
        this._progress = Math.max(this._progress, Math.min(100, p));
        this._listeners.forEach((cb) => cb(this._progress, this._phase));
    }

    async _loadOne(url) {
        // Pixi 8 stores loaded textures under the exact URL passed
        // to `Assets.load()`. We pass the full path here so the
        // cache key matches what `SymbolSprite` later looks up via
        // `Assets.cache.get(url)`.
        try {
            const tex = await Assets.load(url);
            this._textures[url] = tex;
            return tex;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[preloader] failed to load", url, err);
            return null;
        }
    }

    async _run() {
        // 1. Initialize Pixi's Assets with the on-disk manifest.
        //    The manifest defines the "bundles" (e.g. base-game,
        //    free-spins, bonus-game). It's optional — if the file
        //    is missing, Pixi still works, just without bundles.
        //
        // Files are served at /dist/assets/... — both the build
        // output and the dev server reach them at that path.
        //
        // IMPORTANT: do NOT pass `basePath: "/"` here. With
        // basePath set, Pixi v8's Resolver rewrites
        // "/assets/..." into "http://<host>/assets/..." via
        // `path.toAbsolute` and stores the result as the cache
        // key (`Cache.set` in Assets._mapLoadToResolve).
        // `SymbolSprite` then does `Assets.get("/assets/...")`
        // — a path-only key — which never matches, so the sprite
        // falls back to the colored-letter placeholder on first
        // render. The URLs in `config.assets.*` are already
        // site-rooted (`/assets/...`), so they resolve correctly
        // without a basePath. Leave it unset.
        this._setPhase("manifest");
        try {
            await Assets.init({
                manifest: "/assets/manifest.json",
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn(
                "[preloader] manifest missing, continuing without bundles",
                err
            );
        }
        this._setProgress(5);

        // 2. Walk every bundle. Each bundle is a logical group
        //    (e.g. everything for the free-spins round). We
        //    report progress as we sweep through them.
        this._setPhase("bundles");
        const bundleWeight = 25; // bundles account for 5..30
        for (let i = 0; i < BUNDLES.length; i++) {
            const name = BUNDLES[i];
            try {
                await Assets.loadBundle(name);
            } catch {
                // bundle might not exist in this build
            }
            this._setProgress(
                5 + ((i + 1) / BUNDLES.length) * bundleWeight
            );
        }

        // 3. Walk the flat asset list. This is what drives the
        //    visible "Loading..." bar.
        this._setPhase("assets");
        const total = Math.max(ASSETS.length, 1);
        const assetStart = 30;
        const assetSpan = 70;

        for (let i = 0; i < ASSETS.length; i++) {
            const url = ASSETS[i];
            await this._loadOne(url);
            this._setProgress(
                assetStart + ((i + 1) / total) * assetSpan
            );
        }

        this._setProgress(100);
        this._setPhase("done");
        return true;
    }
}

export default new Preloader();
