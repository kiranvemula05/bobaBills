import { Suspense, use } from "react";
import Preloader from "../loaders/Preloader.js";

/**
 * PreloadBoundary
 *
 * Wraps a child in a Suspense boundary that suspends until
 * the preloader has finished. Lets the rest of the app mount
 * before the asset cache is fully warm, but still keeps the
 * `useAssets()` suspension path.
 *
 * Usage:
 *   <PreloadBoundary fallback={<LoadingScreen />}>
 *       <HUD />
 *   </PreloadBoundary>
 */
export function PreloadBoundary({ fallback, children }) {
    return (
        <Suspense fallback={fallback}>
            <PreloadGate>{children}</PreloadGate>
        </Suspense>
    );
}

function PreloadGate({ children }) {
    use(Preloader.preload());
    return children;
}
