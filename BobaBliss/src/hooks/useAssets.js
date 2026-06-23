import { use } from "react";
import Preloader from "../loaders/Preloader.js";

/**
 * useAssets
 *
 * Suspends until the PixiJS asset preloader has finished.
 *
 *   const assets = useAssets();
 *
 * While the preloader is running, React shows the closest
 * <Suspense> fallback. The default <LoadingScreen /> in
 * <Suspense fallback={<LoadingScreen />}> is the natural pair
 * to this hook.
 *
 * The preloader is a singleton; calling it many times returns
 * the same promise.
 */
export function useAssets() {
    return use(Preloader.preload());
}
