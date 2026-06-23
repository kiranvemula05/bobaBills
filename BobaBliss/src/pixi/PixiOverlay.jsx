import { useState, useTransition } from "react";
import { useEventBus } from "../hooks/useEventBus.js";
import { CELL_SIZE_X, CELL_SIZE_Y, GRID_OFFSET } from "./symbolRegistry.js";

/**
 * PixiOverlay
 *
 * Renders the per-cluster multiplier label over winning cells.
 *
 * Cluster updates arrive inside the engine's cascade `while(true)`
 * loop — many emits per spin. `setLabels` is wrapped in a
 * `startTransition` so React can coalesce updates and never block
 * the cascade. Each label is keyed by symbol + anchor cell, so
 * stable keys mean React reconciles in place rather than unmounting.
 */
function PixiOverlay() {
    const [labels, setLabels] = useState([]);
    const [, startTransition] = useTransition();

    useEventBus("CLUSTERS_FOUND", (clusters) => {
        const next = clusters.map((c, i) => ({
            key: `${c.symbol}-${i}-${c.positions[0]?.row ?? 0}-${c.positions[0]?.col ?? 0}`,
            row:
                c.positions.reduce((s, p) => s + p.row, 0) /
                Math.max(1, c.positions.length),
            col:
                c.positions.reduce((s, p) => s + p.col, 0) /
                Math.max(1, c.positions.length),
            multiplier: `x${Math.max(1, c.count - 6)}`,
        }));
        startTransition(() => setLabels(next));
    });

    useEventBus("CASCADE_COMPLETE", () => {
        startTransition(() => setLabels([]));
    });

    return (
        <pixiContainer>
            {labels.map((l) => (
                <pixiText
                    key={l.key}
                    text={l.multiplier}
                    x={GRID_OFFSET.x + l.col * CELL_SIZE_X}
                    y={GRID_OFFSET.y + l.row * CELL_SIZE_Y}
                    anchor={0.5}
                    style={{
                        fill: 0xffeeaa,
                        fontSize: 36,
                        fontWeight: "700",
                        stroke: { color: 0x000000, width: 4 },
                    }}
                />
            ))}
        </pixiContainer>
    );
}

export default PixiOverlay;