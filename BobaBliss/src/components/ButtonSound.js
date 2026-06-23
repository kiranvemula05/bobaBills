import gameConfig from "../games/suger-rush/config.js";
import audioBus from "./audioBus.js";

/**
 * ButtonSound
 *
 * Plays a short click SFX for HUD / pixi button presses. All
 * configuration lives in `gameConfig.audio`, where each button
 * id is a top-level key under `audio.buttons` using the same
 * `{ enabled, src, volume, loop }` shape as `backgroundMusic`
 * and the slot-event sounds.
 *
 *   audio: {
 *     enabled: true,                       // global kill-switch
 *     volume: 0.8,                         // default volume
 *     loop:   false,                       // default loop (one-shot)
 *     backgroundMusic: { enabled, src, volume, loop: true },
 *     spin: { enabled, src, volume, loop: false },
 *     ...
 *     buttons: {
 *       default:  { enabled, src, volume, loop: false },
 *       spin:     { enabled, src, volume, loop: false },
 *       lobby:    { enabled: false },      // <- silent lobby
 *       ...
 *     },
 *   }
 *
 * Resolution rules (per click)
 *  - `audio` missing / `audio.enabled === false` / `audio === false` → silent.
 *  - `audio.buttons` missing → silent.
 *  - Look up the button id (`spin`, `lobby`, ...):
 *      • present + `enabled !== false` → use its src + volume + loop.
 *      • present + `enabled === false` → silent (overrides default).
 *  - Fall back to `audio.buttons.default` if id missing.
 *  - Volume precedence: per-button `volume` → global `audio.volume` → 0.6.
 *  - Loop precedence: per-button `loop` → global `audio.loop` → false.
 *
 * Failure paths are silent — missing files, broken URLs, blocked
 * autoplay, or disabled entries never throw or log.
 *
 * Usage
 *   import ButtonSound from "../components/ButtonSound.js";
 *   <pixiSprite onClick={() => { ButtonSound.play("spin"); handleSpin(); }} />
 */
const POOL_SIZE = 3;

let pool = [];
const cache = new Map();      // url -> HTMLAudioElement
const broken = new Set();     // urls that already failed once
let muted = false;
// Live master volume scalar from the audio bus. Updated by
// the bus subscription below so any subsequent click plays at
// per-entry volume × master volume.
let masterVolume = 1;

function getAudio() {
    return gameConfig?.audio;
}

function getButtonsCfg() {
    const a = getAudio();
    return a && typeof a === "object" ? a.buttons : null;
}

function pickEntry(buttons, id) {
    if (!buttons || typeof buttons !== "object") return null;

    // id-specific entry first, then default.
    const order = [];
    if (Object.prototype.hasOwnProperty.call(buttons, id)) {
        order.push(buttons[id]);
    }
    if (Object.prototype.hasOwnProperty.call(buttons, "default")) {
        order.push(buttons.default);
    }

    const audio = getAudio();
    const globalVolume =
        audio && typeof audio.volume === "number" ? audio.volume : undefined;
    const globalLoop =
        audio && typeof audio.loop === "boolean" ? audio.loop : undefined;

    for (const entry of order) {
        if (!entry || typeof entry !== "object") continue;
        if (entry.enabled === false) {
            // Explicitly disabled — do not fall through.
            return { kind: "off" };
        }
        if (typeof entry.src === "string" && entry.src.length > 0) {
            const volume =
                typeof entry.volume === "number"
                    ? entry.volume
                    : globalVolume;
            const loop =
                typeof entry.loop === "boolean"
                    ? entry.loop
                    : (typeof globalLoop === "boolean" ? globalLoop : false);
            return { kind: "url", url: entry.src, volume, loop };
        }
    }
    return null;
}

function isAudioGloballyEnabled() {
    const a = getAudio();
    if (a === false || a == null) return false;
    if (typeof a !== "object") return false;
    if (a.enabled === false) return false;
    return true;
}

function getElement(url) {
    if (!url || broken.has(url)) return null;
    let el = cache.get(url);
    if (!el) {
        try {
            el = new Audio(url);
            el.preload = "auto";
            el.addEventListener("error", () => {
                // Mark broken so we never re-attempt and never
                // log again. Missing files are expected (a
                // designer may have left a key empty) and must
                // not spam the console.
                broken.add(url);
                cache.delete(url);
            }, { once: true });
            cache.set(url, el);
        } catch {
            broken.add(url);
            return null;
        }
    }
    return el;
}

function ensurePool() {
    while (pool.length < POOL_SIZE) {
        try {
            pool.push(new Audio());
        } catch {
            pool.push(null);
        }
    }
    return pool;
}

function resolveVolume(entry) {
    if (typeof entry.volume === "number") {
        return Math.max(0, Math.min(1, entry.volume));
    }
    return 0.6;
}

const ButtonSound = {
    /**
     * Play the click for `id`. Returns `true` if a sound actually
     * played, `false` otherwise (so callers can chain UI work
     * without depending on the audio path).
     */
    play(id = "default") {
        if (muted) return false;
        if (audioBus.isPaused()) return false;
        if (!isAudioGloballyEnabled()) return false;

        const buttons = getButtonsCfg();
        const entry = pickEntry(buttons, id);
        if (!entry || entry.kind === "off") return false;

        const src = getElement(entry.url);
        if (!src) return false;
        if (src.readyState < 2 /* HAVE_CURRENT_DATA */) {
            try { src.load(); } catch { /* ignore */ }
        }

        ensurePool();
        const slot =
            pool.find((el) => el && (el.paused || el.ended)) ??
            pool.find(Boolean);
        if (!slot) return false;

        try {
            if (slot.src !== src.src) slot.src = src.src;
            slot.loop = entry.loop === true;
            // Per-entry volume from the config × master volume
            // from the audio bus, clamped to [0,1] so a slot at
            // 1.0 with master 1.5 doesn't blow out the speakers.
            slot.volume = Math.max(
                0,
                Math.min(1, resolveVolume(entry) * masterVolume)
            );
            slot.currentTime = 0;
            const p = slot.play();
            if (p && typeof p.catch === "function") {
                p.catch(() => { /* blocked — silent */ });
            }
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Stop every active click in the pool. Used by the global
     * mute toggle so a long click can't keep playing while
     * everything else is silent.
     */
    stopAll() {
        for (const el of pool) {
            if (!el) continue;
            try {
                el.pause();
                el.currentTime = 0;
            } catch {
                /* ignore — element may already be torn down */
            }
        }
    },

    /** Globally mute / unmute button sounds (BGM is untouched). */
    setMuted(value) {
        muted = !!value;
    },

    isMuted() {
        return muted;
    },

    /**
     * Pre-warm the most common button sounds so the first click
     * is at full volume. Safe to call repeatedly; broken URLs
     * short-circuit silently.
     */
    preload(ids = []) {
        if (!isAudioGloballyEnabled()) return;
        const buttons = getButtonsCfg();
        for (const id of ids) {
            const entry = pickEntry(buttons, id);
            if (entry && entry.kind === "url") getElement(entry.url);
        }
    },

    /** Test helper: forget caches (used by tests / dev hot-reload). */
    __reset() {
        pool = [];
        cache.clear();
        broken.clear();
        muted = false;
    },
};

// When the global audio bus flips, update internal state. When
// it pauses, kill every click in the pool so a long click can't
// keep playing while everything else is silent. When the master
// volume changes, record it so the next click plays at the new
// level.
audioBus.subscribe(({ paused, volume }) => {
    masterVolume = volume;
    if (paused) ButtonSound.stopAll();
});

export default ButtonSound;
