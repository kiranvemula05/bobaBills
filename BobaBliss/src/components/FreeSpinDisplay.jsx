import { useGameStore } from "../store/gameStore.js";

/**
 * FreeSpinDisplay
 *
 * Reads the free-spin counter from the store. Hidden when zero.
 */
function FreeSpinDisplay() {
    const freeSpins = useGameStore((s) => s.freeSpins);
    if (!freeSpins) return null;

    return (
        <div
            style={{
                position: "absolute",
                top: 20,
                right: 20,
                padding: "12px 20px",
                background:
                    "linear-gradient(135deg, #ff7ab6, #ffb86b)",
                color: "#1a1a1a",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 18,
                boxShadow: "0 4px 20px rgba(255,122,182,0.5)",
            }}
        >
            FREE SPINS: {freeSpins}
        </div>
    );
}

export default FreeSpinDisplay;
