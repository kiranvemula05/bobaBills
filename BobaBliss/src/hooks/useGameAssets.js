import { use } from "react";
import AssetRegistry from "../loaders/AssetRegistry.js";

/**
 * useGameAssets
 *
 * Suspends until the given game's asset bundle has finished
 * loading. Pair with <Suspense fallback={<LoadingScreen />}>.
 *
 *   const assets = useGameAssets("sugar-rush");
 *
 * If no gameId is passed, the first registered game wins.
 *
 * The hook is intentionally minimal: it returns a stable truthy
 * value when done so React un-suspends; consumers rarely need
 * the value itself, they just need to know loading finished.
 */
export function useGameAssets(gameId) {
    const id = gameId ?? AssetRegistry.getDefaultGameId();
    return use(AssetRegistry.preloadGame(id));
}

/**
 * useRegisteredGames
 *
 * Lightweight introspection hook for surfaces that want to list
 * available games (lobby, debug menus). Returns the registered
 * gameId list in registration order.
 */
export function useRegisteredGames() {
    return Array.from(AssetRegistry._games?.keys?.() ?? []);
}