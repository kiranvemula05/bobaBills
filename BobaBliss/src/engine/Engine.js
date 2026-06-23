/**
 * Backwards-compatible default export. The new code path goes
 * through `SlotEngine` (see ./SlotEngine.js); this file is kept so
 * legacy `import Engine from "../engine"` continues to work.
 */
import SlotEngine from "./SlotEngine.js";

export default SlotEngine;
