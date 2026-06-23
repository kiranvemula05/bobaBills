import AssetRegistry from "../../loaders/AssetRegistry.js";
import gameConfig from "./config.js";

/**
 * sugar-rush game module.
 *
 * Self-registers with the AssetRegistry at module load. Any
 * component that imports `games/suger-rush` (intentionally or
 * transitively) will trigger the registration as a side effect.
 * AssetRegistry.register() is idempotent so re-imports are safe.
 */
AssetRegistry.register(gameConfig.id, gameConfig);

export { gameConfig };
export { default as AssetRegistry } from "../../loaders/AssetRegistry.js";