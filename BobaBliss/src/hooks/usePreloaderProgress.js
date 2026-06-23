import { useEffect, useState } from "react";
import Preloader from "../loaders/Preloader.js";

/**
 * usePreloaderProgress
 *
 * React hook that mirrors the preloader singleton's progress
 * (0..100) and current phase ("manifest" | "bundles" | "assets"
 * | "done") into component state.
 *
 * We use a subscribe + rAF-throttled state snapshot rather than
 * `useSyncExternalStore`. The preloader emits a callback for
 * every individual asset it loads (potentially dozens per
 * frame); `useSyncExternalStore` schedules a synchronous render
 * for each one, which can push past React's update-depth limit
 * when the asset sweep and the cascade loop overlap. Throttling
 * through `requestAnimationFrame` coalesces the flood into one
 * update per paint.
 */
export function usePreloaderProgress() {
    const [snapshot, setSnapshot] = useState(() => ({
        progress: Preloader.getProgress(),
        phase: Preloader.getPhase(),
    }));

    useEffect(() => {
        let pending = false;
        let lastProgress = -1;
        let lastPhase = null;
        const flush = () => {
            pending = false;
            const progress = Preloader.getProgress();
            const phase = Preloader.getPhase();
            if (progress === lastProgress && phase === lastPhase) {
                return;
            }
            lastProgress = progress;
            lastPhase = phase;
            setSnapshot({ progress, phase });
        };
        const schedule = () => {
            if (pending) return;
            pending = true;
            // rAF when available — falls back to a 0ms timer in
            // non-DOM environments (tests, SSR).
            if (
                typeof window !== "undefined" &&
                typeof window.requestAnimationFrame === "function"
            ) {
                window.requestAnimationFrame(flush);
            } else {
                setTimeout(flush, 0);
            }
        };
        // Initial sync, then subscribe.
        flush();
        const unsubscribe = Preloader.subscribeProgress(schedule);
        return unsubscribe;
    }, []);

    return snapshot;
}
