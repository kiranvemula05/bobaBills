import { useCallback, useEffect, useRef, useState } from "react";
import Preloader from "../loaders/Preloader.js";
import gameConfig from "../games/suger-rush/config.js";
import audioBus from "./audioBus.js";

/**
 * BackgroundMusic
 *
 * Plays a looping background track once the asset preloader has
 * finished. Configuration lives in `gameConfig.audio.backgroundMusic`:
 *
 *   audio: {
 *     backgroundMusic: {
 *       enabled: true,
 *       src: "/assets/audio/background.mp3",
 *       volume: 0.5
 *     }
 *   }
 *
 * Behaviour
 * ---------
 *  - If `enabled` is false or missing, the component renders
 *    nothing and does nothing.
 *  - The <audio> element is mounted immediately so the browser
 *    can fetch + decode it in parallel with the loading screen.
 *  - On load-done we attempt `el.play()`. If the browser blocks
 *    autoplay, we render a full-screen "TAP TO PLAY" splash —
 *    the very click that dismisses the splash is a user gesture
 *    the autoplay policy accepts, so music always starts on the
 *    first interaction.
 *  - Listeners + audio element clean up on unmount.
 */
function BackgroundMusic() {
    const cfg = gameConfig?.audio?.backgroundMusic;
    const audioRef = useRef(null);
    // Live master volume from the audio bus. We keep a ref so
    // the play() call (which runs inside an effect) and the
    // bus-subscription effect stay decoupled.
    const masterVolumeRef = useRef(audioBus.getVolume());

    const enabled = cfg?.enabled === true;
    const src = cfg?.src;
    const volume =
        typeof cfg?.volume === "number" ? cfg.volume : 0.5;
    const loop = cfg?.loop !== false; // default true for BGM

    const [preloaderDone, setPreloaderDone] = useState(
        () => Preloader.getPhase() === "done"
    );
    const [needsGesture, setNeedsGesture] = useState(false);

    // Track preloader completion. We need the preloader "done"
    // phase before we attempt play() so the splash (if shown)
    // doesn't dismiss onto a half-loaded track.
    useEffect(() => {
        if (!enabled || !src) return undefined;
        if (preloaderDone) return undefined;
        const unsubscribe = Preloader.subscribeProgress((_p, phase) => {
            if (phase === "done") setPreloaderDone(true);
        });
        if (Preloader.getPhase() === "done") setPreloaderDone(true);
        return unsubscribe;
    }, [enabled, src, preloaderDone]);

    // Try to start playback once the preloader is done. If
    // autoplay is blocked, raise the splash.
    useEffect(() => {
        if (!enabled || !src) return undefined;
        const el = audioRef.current;
        if (!el) return undefined;

        let cancelled = false;

        const tryStart = () => {
            if (cancelled || !el) return;
            if (el.readyState < 2 /* HAVE_CURRENT_DATA */) return;
            let p;
            try {
                p = el.play();
            } catch {
                setNeedsGesture(true);
                return;
            }
            if (p && typeof p.then === "function") {
                p.then(() => {
                    if (!cancelled) setNeedsGesture(false);
                }).catch(() => {
                    if (!cancelled) setNeedsGesture(true);
                });
            } else if (!cancelled) {
                setNeedsGesture(false);
            }
        };

        if (el.readyState >= 2) {
            tryStart();
        } else {
            const onReady = () => tryStart();
            el.addEventListener("canplay", onReady, { once: true });
            el.addEventListener("loadeddata", onReady, { once: true });
            return () => {
                cancelled = true;
                el.removeEventListener("canplay", onReady);
                el.removeEventListener("loadeddata", onReady);
            };
        }

        return () => {
            cancelled = true;
        };
    }, [enabled, src, preloaderDone]);

    // The splash itself is the user gesture. The click handler
    // calls play() synchronously inside the React event — that's
    // a trusted gesture even if the splash is dismissed on the
    // same tick.
    const handleSplashClick = useCallback(() => {
        const el = audioRef.current;
        if (!el) return;
        el.muted = false;
        el.volume = volume;
        let p;
        try {
            p = el.play();
        } catch {
            return;
        }
        if (p && typeof p.then === "function") {
            p.then(() => setNeedsGesture(false)).catch(() => {
                /* still blocked — leave splash up for another click */
            });
        } else {
            setNeedsGesture(false);
        }
    }, [volume]);

    if (!enabled || !src) return null;

    // Pause / resume the BGM in lockstep with the global audio
    // bus. The bus flips `paused` to `true` when the user mutes
    // (Sound pill → Muted, volume bar hitting 0%, or HUD Sound
    // button) and to `false` when they unmute from any of those
    // sources. We always attempt to resume playback on a
    // `paused: false` tick, regardless of `wasPlayingRef`, so
    // every unmute path works — including the volume 0 → +
    // sequence where the initial `play()` may have run before
    // this subscription was attached.
    //
    // The same subscription also scales the BGM's effective
    // volume by the master volume scalar from the bus — the
    // settings popup writes through to that scalar and this is
    // where it lands on the <audio> element.
    useEffect(() => {
        const unsubscribe = audioBus.subscribe(({ paused, volume }) => {
            masterVolumeRef.current = volume;
            const el = audioRef.current;
            if (!el) return;
            // Live-update BGM volume: master volume from bus
            // (already clamped in audioBus.setVolume). Per-entry
            // BGM volume is baked into the master at play() time
            // by handleSplashClick — see below.
            try {
                el.volume = Math.max(0, Math.min(1, volume));
            } catch { /* ignore */ }
            if (paused) {
                try { el.pause(); } catch { /* ignore */ }
            } else if (el.paused) {
                // Unmuted from any path (volume 0 → +, Sound
                // pill toggle, HUD Sound button). Try to start
                // playback — fire-and-forget the promise so a
                // blocked play() (autoplay policy) doesn't
                // throw, in which case we re-show the splash.
                try {
                    const p = el.play();
                    if (p && typeof p.then === "function") {
                        p.then(() => setNeedsGesture(false)).catch(
                            () => setNeedsGesture(true)
                        );
                    } else {
                        setNeedsGesture(false);
                    }
                } catch {
                    setNeedsGesture(true);
                }
            }
        });
        return unsubscribe;
    }, []);

    return (
        <>
            <audio
                ref={audioRef}
                src={src}
                loop={loop}
                preload="auto"
                muted={false}
                onError={() => {
                    /* missing audio file — silent no-op */
                }}
            />
            {needsGesture && preloaderDone && (
                <div
                    className="bgm-splash"
                    role="button"
                    tabIndex={0}
                    onClick={handleSplashClick}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSplashClick();
                        }
                    }}
                >
                    <div className="bgm-splash__inner">
                        <h2 className="bgm-splash__title">
                            {gameConfig?.name ?? "Sugar Rush"}
                        </h2>
                        <p className="bgm-splash__cta">Tap to play</p>
                    </div>
                </div>
            )}
        </>
    );
}

export default BackgroundMusic;
