import { useCallback, useEffect, useMemo } from "react";
import { Rectangle } from "pixi.js";
import { useGameStore } from "../store/gameStore.js";
import gameConfig from "../games/suger-rush/config.js";
import PAYTABLE from "../games/suger-rush/paytable.js";

// Helper: build a Rectangle hit area without allocating a new
// Rectangle on every render. Memoised by (w, h, ox, oy).
const _hitAreaCache = new Map();
function useMemoHitArea(width, height, ox = 0, oy = 0) {
    const key = `${width}x${height}@${ox},${oy}`;
    let r = _hitAreaCache.get(key);
    if (!r) {
        r = new Rectangle(ox, oy, width, height);
        _hitAreaCache.set(key, r);
    }
    return r;
}

/**
 * PaytablePopup (Pixi)
 *
 * Renders the paytable inside the Pixi canvas so it visually
 * lives "inside" the game frame. Sized to 80% × 80% of the
 * canvas and centred.
 *
 * Close behaviour
 *  - Click the × button      → popup closes.
 *  - Press Escape            → popup closes.
 *
 * (Backdrop click is intentionally NOT a close trigger for the
 * paytable — the user asked for close-on-button-only.)
 *
 * Background-button suppression
 *
 *  While the popup is open we render an invisible full-canvas
 *  `<pixiGraphics eventMode="static">` FIRST, before the
 *  visible backdrop and panel. Because Pixi v8 walks children
 *  front-to-back during hit testing and the FIRST interactive
 *  match wins, this blocker swallows clicks anywhere on the
 *  canvas — including clicks that would otherwise reach the
 *  SettingsButton, PaytableButton, SpinButton, SoundButton,
 *  BetPanel, BalancePanel, AutoSpinButton, TopBar lobby
 *  button, etc. The blocker's `onClick` is a no-op, so it
 *  never closes the popup.
 *
 *  Only the `CloseButton`'s circle inside `PaytablePanel` is
 *  reachable, because the panel is rendered AFTER the blocker
 *  at a higher z-order and the close button itself has its own
 *  `eventMode="static" onClick={onClose}`. Pressing Escape also
 *  closes via the window keydown listener.
 *
 *  When the popup is closed (`paytableOpen === false`), the
 *  component returns `null` and nothing is rendered, so the
 *  blocker disappears and all background buttons work again.
 *
 * Same wiring pattern as `SettingsPopup`:
 *  - The panel's only interactive child is the close button
 *    circle. The decorative panel rect + text labels default
 *    to `passive` event mode, so they don't intercept clicks.
 */

// Symbol labels mirror `src/games/suger-rush/symbols.js`. Listed
// in the order they appear in the paytable.
const SYMBOL_ROWS = [
    { key: "RED_CANDY", label: "Red Candy" },
    { key: "BLUE_CANDY", label: "Blue Candy" },
    { key: "GREEN_CANDY", label: "Green Candy" },
    { key: "YELLOW_CANDY", label: "Yellow Candy" },
    { key: "PURPLE_CANDY", label: "Purple Candy" },
    { key: "ORANGE_CANDY", label: "Orange Candy" },
    { key: "BLACK_CANDY", label: "Black Candy" },
    { key: "SCATTER", label: "Scatter (Free Spins)" },
];

function PaytablePopup() {
    const open = useGameStore((s) => s.paytableOpen);
    const close = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log("[paytablepopup] close()");
        useGameStore.setState({ paytableOpen: false });
    }, []);

    // Esc closes the popup while it's open.
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                close();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, close]);

    if (!open) return null;

    const stage = gameConfig?.layout?.stage ?? {};
    const canvasW = typeof stage.width === "number" ? stage.width : 1280;
    const canvasH = typeof stage.height === "number" ? stage.height : 720;

    // 80% of canvas, centred.
    const panelW = Math.round(canvasW * 0.8);
    const panelH = Math.round(canvasH * 0.8);
    const panelX = Math.round((canvasW - panelW) / 2);
    const panelY = Math.round((canvasH - panelH) / 2);

    return (
        <pixiContainer>
            {/* Invisible full-canvas blocker. Rendered FIRST so
               it sits at the bottom of the popup's z-stack and
               is the first thing hit-tested. It absorbs clicks
               so background buttons (Settings, Sound, Spin,
               Paytable, Lobby, etc.) can't fire while the
               popup is open. It's invisible (alpha=0) and has a
               no-op onClick so it never closes the popup. */}
            <BackgroundClickBlocker
                width={canvasW}
                height={canvasH}
            />
            <PaytableBackdrop
                width={canvasW}
                height={canvasH}
            />
            <PaytablePanel
                x={panelX}
                y={panelY}
                width={panelW}
                height={panelH}
                onClose={close}
            />
        </pixiContainer>
    );
}

/**
 * BackgroundClickBlocker
 *
 * Invisible full-canvas `<pixiGraphics>` with
 * `eventMode="static"` and an explicit `hitArea` covering the
 * whole canvas. The first interactive child wins hit testing
 * in Pixi v8, so by rendering this as the first child we make
 * sure it swallows every click that lands on the canvas while
 * the popup is open — preventing the underlying SettingsButton,
 * PaytableButton, SpinButton, SoundButton, BetPanel, etc.
 * from firing.
 *
 * `onClick` is a no-op so the blocker never closes the popup.
 * The actual close trigger (× button + Escape) lives higher in
 * the z-stack inside `PaytablePanel` and the window keydown
 * listener, both of which still work because Pixi's hit tester
 * walks further children on the same target and `propagate`
 * still bubbles up.
 */
function BackgroundClickBlocker({ width, height }) {
    const draw = useCallback(
        (g) => {
            g.clear();
            // Invisible — alpha 0. We only care about the
            // hitArea, not the pixels.
            g.beginFill(0x000000, 0);
            g.drawRect(0, 0, width, height);
            g.endFill();
        },
        [width, height]
    );

    return (
        <pixiGraphics
            draw={draw}
            eventMode="static"
            hitArea={useMemoHitArea(width, height)}
            onClick={() => {
                // Swallow the click. Do NOT close the popup —
                // only the × button (and Escape) should.
            }}
        />
    );
}

/**
 * PaytableBackdrop
 *
 * Full-canvas tinted rectangle for visual separation. It is
 * intentionally NOT interactive — the paytable closes only via
 * the × button or Escape. No `eventMode` → defaults to
 * `passive`, so it doesn't intercept clicks.
 */
function PaytableBackdrop({ width, height }) {
    const draw = useCallback(
        (g) => {
            g.clear();
            g.beginFill(0x050a28, 0.7);
            g.drawRect(0, 0, width, height);
            g.endFill();
        },
        [width, height]
    );

    return <pixiGraphics draw={draw} />;
}

/**
 * PaytablePanel
 *
 * Framed panel + header + close button + body listing each
 * symbol and its cluster-size → multiplier mapping.
 */
function PaytablePanel({ x, y, width, height, onClose }) {
    const drawPanel = useCallback(
        (g) => {
            g.clear();
            // Outer drop shadow.
            g.beginFill(0x000000, 0.45);
            g.drawRoundedRect(2, 4, width, height, 16);
            g.endFill();

            // Panel fill.
            g.beginFill(0x1a2040);
            g.drawRoundedRect(0, 0, width, height, 16);
            g.endFill();

            // Header band.
            g.beginFill(0xffffff, 0.04);
            g.drawRoundedRect(0, 0, width, 48, 16);
            g.endFill();

            // Header bottom border.
            g.beginFill(0xffffff, 0.06);
            g.drawRect(0, 48, width, 1);
            g.endFill();

            // Border.
            g.lineStyle({ width: 1, color: 0xffffff, alpha: 0.08 });
            g.drawRoundedRect(0, 0, width, height, 16);
        },
        [width, height]
    );

    // Layout for the body area below the 48px header.
    const bodyX = 24;
    const bodyY = 48 + 16;
    const bodyW = width - bodyX * 2;
    const bodyH = height - bodyY - 24;

    return (
        <pixiContainer x={x} y={y}>
            <pixiGraphics draw={drawPanel} />

            <pixiText
                text="Paytable"
                x={24}
                y={24}
                anchor={{ x: 0, y: 0.5 }}
                style={{
                    fill: 0xf5f5f5,
                    fontSize: 22,
                    fontWeight: "700",
                    letterSpacing: 1,
                }}
            />

            <CloseButton
                x={width - 32}
                y={24}
                radius={18}
                onClick={onClose}
            />

            <PaytableBody
                x={bodyX}
                y={bodyY}
                width={bodyW}
                height={bodyH}
            />
        </pixiContainer>
    );
}

/**
 * PaytableBody
 *
 * Renders the symbol rows. Cluster thresholds + payouts come
 * from `games/suger-rush/paytable.js`. The body auto-fits a
 * font size based on the number of rows so the table never
 * overflows the 80% canvas height.
 */
function PaytableBody({ x, y, width, height }) {
    // Resolve rows once per render. Memoising keeps the array
    // reference stable for downstream children.
    const rows = useMemo(
        () =>
            SYMBOL_ROWS.map((s) => ({
                ...s,
                payouts: PAYTABLE[s.key] ?? {},
            })),
        []
    );

    const rowGap = 6;
    const rowH = Math.max(
        28,
        Math.min(56, Math.floor((height - rowGap * (rows.length - 1)) / rows.length))
    );
    const headerH = Math.max(24, Math.min(36, Math.round(rowH * 0.65)));

    return (
        <pixiContainer x={x} y={y}>
            {/* Column header row. */}
            <PaytableHeader
                x={0}
                y={0}
                width={width}
                height={headerH}
            />

            {/* Symbol rows. */}
            {rows.map((row, i) => (
                <PaytableRow
                    key={row.key}
                    x={0}
                    y={headerH + rowGap + i * (rowH + rowGap)}
                    width={width}
                    height={rowH}
                    label={row.label}
                    payouts={row.payouts}
                />
            ))}
        </pixiContainer>
    );
}

/**
 * PaytableHeader
 *
 * Two-column header: "Symbol" on the left, "Cluster → Payout"
 * on the right. The right column lists cluster thresholds.
 */
function PaytableHeader({ x, y, width, height }) {
    const drawHeader = useCallback(
        (g) => {
            g.clear();
            g.beginFill(0xffffff, 0.06);
            g.drawRoundedRect(0, 0, width, height, 6);
            g.endFill();
        },
        [width, height]
    );

    const fontSize = Math.max(10, Math.min(16, Math.round(height * 0.55)));
    const symbolColW = Math.round(width * 0.32);

    return (
        <pixiContainer x={x} y={y}>
            <pixiGraphics draw={drawHeader} />
            <pixiText
                text="Symbol"
                x={14}
                y={height / 2}
                anchor={{ x: 0, y: 0.5 }}
                style={{
                    fill: 0xf5f5f5,
                    fontSize,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                }}
            />
            <pixiText
                text="Cluster Size"
                x={symbolColW + 14}
                y={height / 2}
                anchor={{ x: 0, y: 0.5 }}
                style={{
                    fill: 0xf5f5f5,
                    fontSize,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                }}
            />
        </pixiContainer>
    );
}

/**
 * PaytableRow
 *
 * One symbol's payout row: label on the left, then a strip of
 * `count → payout` cells on the right. The scatter row formats
 * its payouts as `N free spins` instead of a multiplier.
 */
function PaytableRow({ x, y, width, height, label, payouts }) {
    const drawRow = useCallback(
        (g) => {
            g.clear();
            g.beginFill(0xffffff, 0.025);
            g.drawRoundedRect(0, 0, width, height, 6);
            g.endFill();
            g.lineStyle({ width: 1, color: 0xffffff, alpha: 0.05 });
            g.drawRoundedRect(0, 0, width, height, 6);
        },
        [width, height]
    );

    const fontSize = Math.max(9, Math.min(14, Math.round(height * 0.45)));
    const symbolColW = Math.round(width * 0.32);
    const entries = Object.entries(payouts);

    return (
        <pixiContainer x={x} y={y}>
            <pixiGraphics draw={drawRow} />
            <pixiText
                text={label}
                x={14}
                y={height / 2}
                anchor={{ x: 0, y: 0.5 }}
                style={{
                    fill: 0xf5f5f5,
                    fontSize,
                    fontWeight: "600",
                }}
            />
            {entries.map(([count, payout], i) => {
                const cellW = Math.floor((width - symbolColW) / Math.max(1, entries.length));
                const cellX = symbolColW + i * cellW;
                const text =
                    typeof payout === "number"
                        ? `${count}+ → ${payout}`
                        : `${count}+ → ${String(payout).replace("FREE_SPINS_", "")} FS`;
                return (
                    <pixiText
                        key={count}
                        text={text}
                        x={cellX + cellW / 2}
                        y={height / 2}
                        anchor={0.5}
                        style={{
                            fill: 0xffeeaa,
                            fontSize,
                            fontWeight: "600",
                        }}
                    />
                );
            })}
        </pixiContainer>
    );
}

/**
 * CloseButton
 *
 * Round button holding a × glyph. Click closes the popup.
 *
 * The hit target is the `Graphics` circle. The `Text` × glyph
 * is layered on top with no `eventMode` so it's pure decoration
 * — clicks always land on the circle below.
 *
 * Mirrors the wiring pattern used in `SettingsPopup.CloseButton`
 * (eventMode="static" + cursor="pointer" + hitArea + onClick).
 */
function CloseButton({ x, y, radius, onClick }) {
    const drawBg = useCallback(
        (g) => {
            g.clear();
            g.lineStyle({ width: 1, color: 0xffffff, alpha: 0.18 });
            g.beginFill(0xffffff, 0.04);
            g.drawCircle(0, 0, radius);
            g.endFill();
        },
        [radius]
    );

    const hitArea = useMemoHitArea(radius * 2, radius * 2, -radius, -radius);

    const wrappedClick = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log("[paytablepopup] close button pointertap");
        onClick();
    }, [onClick]);

    return (
        <pixiContainer x={x} y={y}>
            <pixiGraphics
                draw={drawBg}
                eventMode="static"
                cursor="pointer"
                hitArea={hitArea}
                onClick={wrappedClick}
            />
            <pixiText
                text="×"
                anchor={0.5}
                style={{
                    fill: 0xf5f5f5,
                    fontSize: Math.round(radius * 1.4),
                    fontWeight: "700",
                }}
            />
        </pixiContainer>
    );
}

export default PaytablePopup;
