import { useState, useTransition } from "react";
import { useGameStore } from "../store/gameStore.js";
import { useEventBus } from "../hooks/useEventBus.js";
import SymbolSprite from "./SymbolSprite.jsx";
/**
 * PixiGrid
 *
 * Renders the 7x7 grid of `SymbolSprite`s. Listens for the
 * `CLUSTERS_FOUND` and `CASCADE_COMPLETE` events to mark which
 * cells are currently "winning".
 */
function PixiGrid() {
    const grid = useGameStore(state => state.grid);
    const [winning, setWinning] = useState(() => new Set());
    const [, startTransition] = useTransition();

    useEventBus("CLUSTERS_FOUND", (clusters) => {
        const cells = new Set();
        for (const c of clusters) {
            for (const { row, col } of c.positions) {
                cells.add(`${row}-${col}`);
            }
        }
        startTransition(() => setWinning(cells));
    });

    useEventBus("CASCADE_COMPLETE", () => {
        startTransition(() => setWinning(new Set()));
    });

    return (
        <pixiContainer>
            {grid.map((row, r) =>
                row.map((symbol, c) => {
                    if (symbol === null) return null;
                    return (
                        <SymbolSprite
                            key={`${r}-${c}`}
                            symbol={symbol}
                            row={r}
                            col={c}
                            isWinning={winning.has(`${r}-${c}`)}
                        />
                    );
                })
            )}
        </pixiContainer>
    );
}

export default PixiGrid;