/**
 * audioBus
 *
 * Tiny pub/sub so a single Sound button can stop every audio
 * source in the game at once — BGM, looping slot-event sounds,
 * and click sounds — and restart them when the user toggles
 * audio back on.
 *
 * Subscribers receive `{ paused, volume }`. When `paused` flips
 * to `true`, every audio element must pause itself (and remember
 * it was playing so a future `paused: false` can resume it).
 * `volume` is the master scalar in `[0, 1]` set by the
 * settings-popup volume row; every audio source multiplies its
 * own per-entry volume by it before reaching the `<audio>`
 * element so changing volume is global and live.
 *
 * Used by:
 *   - BackgroundMusic.jsx — pauses / resumes the BGM <audio>.
 *   - ButtonSound.js      — stops its click pool and refuses to
 *                           play new clicks while paused.
 *   - pixi/sound.jsx      — fires `setPaused(!muted)` on click.
 *   - components/SettingsPopup.jsx — shows the master volume
 *                           row and writes through to the bus.
 */
const subscribers = new Set();
let paused = false;
let volume = 1;

function notify() {
    // Snapshot so subscribers can't observe a half-updated state.
    const snapshot = { paused, volume };
    for (const cb of subscribers) {
        try {
            cb(snapshot);
        } catch {
            /* subscriber errors must not break the bus */
        }
    }
}

const audioBus = {
    /** Subscribe to pause / resume + volume events. Returns an unsubscribe. */
    subscribe(cb) {
        subscribers.add(cb);
        // Replay the current state immediately so the new
        // subscriber doesn't have to wait for the next toggle.
        try { cb({ paused, volume }); } catch { /* ignore */ }
        return () => subscribers.delete(cb);
    },

    /** Pause every audio source. Idempotent. */
    pause() {
        if (paused) return;
        paused = true;
        notify();
    },

    /** Resume every audio source. Idempotent. */
    resume() {
        if (!paused) return;
        paused = false;
        notify();
    },

    /** Returns true if audio is globally paused. */
    isPaused() {
        return paused;
    },

    /** Flip the current state. Returns the new state. */
    toggle() {
        paused = !paused;
        notify();
        return paused;
    },

    /**
     * Set the master volume scalar. Value is clamped to [0, 1].
     * Subscribers receive the new value on the next tick so they
     * can update live audio elements without restarting playback.
     */
    setVolume(value) {
        const v = Math.max(0, Math.min(1, Number(value)));
        if (v === volume) return;
        volume = v;
        notify();
    },

    /** Returns the current master volume scalar in [0, 1]. */
    getVolume() {
        return volume;
    },
};

export default audioBus;
