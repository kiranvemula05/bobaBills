/*
 * components/WinDisplay.jsx — DEAD-CODE COMMENTED OUT 2026-06-22.
 *
 * DOM overlay that ran a count-up tween for the current /
 * total win. The shipped game routes the same data through
 * the Pixi `GameMessage` strip + `pixi/PixiOverlay.jsx` (the
 * per-cluster multiplier label that doubles as the win
 * announcement). Not mounted from `app.jsx`.
 *
 * Original contents preserved below for future restoration:
 */


import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore.js";

function WinDisplay() {
    const totalWin = useGameStore((s) => s.totalWin);
    const currentWin = useGameStore((s) => s.currentWin);
    const balance = useGameStore((s) => s.balance);

    const [displayWin, setDisplayWin] = useState(totalWin);
    const totalWinRef = useRef(totalWin);

    useEffect(() => {
        totalWinRef.current = totalWin;
        setDisplayWin(totalWin);
    }, [totalWin]);

    useEffect(() => {
        const id = setInterval(() => {
            setDisplayWin((cur) => {
                const end = totalWinRef.current;
                if (cur >= end) return cur;
                const step = Math.max(
                    1,
                    Math.ceil((end - cur) / 10)
                );
                const next = cur + step;
                return next > end ? end : next;
            });
        }, 30);
        return () => clearInterval(id);
    }, []);

    return (
        <div
            style={{
                position: "absolute",
                top: 20,
                left: 20,
                padding: "12px 20px",
                background: "rgba(17,17,17,0.85)",
                color: "#fff",
                borderRadius: 12,
                minWidth: 240,
                backdropFilter: "blur(4px)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    opacity: 0.6,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                }}
            >
                Balance
            </div>
            <div
                style={{
                    fontSize: 22,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                }}
            >
                ₹{balance.toLocaleString()}
            </div>
            <hr
                style={{
                    border: "none",
                    borderTop: "1px solid #2a2d36",
                    margin: "8px 0",
                }}
            />
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    opacity: 0.85,
                }}
            >
                <span>Current</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {currentWin}
                </span>
            </div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 16,
                    fontWeight: 700,
                }}
            >
                <span>Total</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {displayWin}
                </span>
            </div>
        </div>
    );
}

export default WinDisplay;
