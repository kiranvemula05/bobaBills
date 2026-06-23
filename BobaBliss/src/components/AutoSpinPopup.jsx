import { useCallback, useEffect, useMemo } from "react";
import { Rectangle } from "pixi.js";
import { useGameStore } from "../store/gameStore.js";
import gameConfig from "../games/suger-rush/config.js";
import SlotEngine from "../engine/SlotEngine.js";
import ButtonSound from "./ButtonSound.js";

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
 * AutoSpinPopup (Pixi)
 *
 * Auto-spin picker. Opens when the user clicks the AutoSpin
 * HUD button. Lists the spin counts configured in
 * `gameConfig.layout.autoSpin.options` plus a STOP entry that
 * cancels an in-flight auto-spin run.
 *
 * Close behaviour
 *  - Click the × button          → popup closes.
 *  - Click outside the panel     → popup closes (same pattern
 *                                  as `SettingsPopup`).
 *  - Press Escape                → popup closes.
 *  - Pick a spin count           → popup closes + that count is
 *                                  started via SlotEngine.
 *  - Click STOP                  → popup closes + auto-spin is
 *                                  cancelled via SlotEngine.
 *
 * Background-button suppression
 *
 *  Same pattern as `PaytablePopup`: an invisible full-canvas
 *  `BackgroundClickBlocker` is rendered first so clicks on the
 *  dimmed area (or on the underlying HUD buttons like Sound /
 *  Spin / Settings / Paytable / Lobby) are swallowed while the
 *  popup is open. The blocker's `onClick` is a no-op so it
 *  never closes the popup — closing is handled by the backdrop
 *  `onClick`, the × button, Escape, or a row click.
 */
function AutoSpinPopup() {
    const open = useGameStore((s) => s.autoSpinPanelOpen);
    const autoSpinRemaining = useGameStore((s) => s.autoSpinRemaining);
    const close = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log("[autospinpopup] close()");
        useGameStore.setState({ autoSpinPanelOpen: false });
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

    // Spin counts come from the per-game config so adding a new
    // game can offer different auto-spin presets without
    // touching this component. Fall back to the documented
    // defaults if the config is missing the entry.
    const options = useMemo(
        () => gameConfig?.layout?.autoSpin?.options ?? [10, 25, 50, 100],
        []
    );

    const startWith = (count) => {
        ButtonSound.play("autoSpin");
        SlotEngine.startAutoSpin(count);
        close();
    };

    const stop = () => {
        ButtonSound.play("autoSpin");
        SlotEngine.stopAutoSpin();
        close();
    };

    if (!open) return null;

    const stage = gameConfig?.layout?.stage ?? {};
    const canvasW = typeof stage.width === "number" ? stage.width : 1280;
    const canvasH = typeof stage.height === "number" ? stage.height : 720;

    // Small, focused panel — sits next to the auto-spin button
    // on the right column rather than taking over the screen.
    // Width = 260, height auto-fits the row count.
    const panelW = 260;
    const headerH = 48;
    const rowH = 44;
    const rowGap = 6;
    const stopRowExtra = 14;
    const totalRows = options.length + (autoSpinRemaining > 0 ? 1 : 0);
    const panelH =
        headerH + (rowH + rowGap) * totalRows + stopRowExtra + 24;
    const panelX = Math.round((canvasW - panelW) / 2);
    const panelY = Math.round((canvasH - panelH) / 2);

    return (
        <pixiContainer>
            {/* Invisible full-canvas blocker. First child →
               first interactive match → swallows clicks on
               underlying HUD buttons while the popup is open. */}
            <BackgroundClickBlocker
                width={canvasW}
                height={canvasH}
            />

            {/* Visible dimmed backdrop. No eventMode — passive
               visual layer only. Matches `PaytablePopup` /
               `SettingsPopup`: backdrop click does NOT close. */}
            <AutoSpinBackdrop
                width={canvasW}
                height={canvasH}
            />

            <AutoSpinPanel
                x={panelX}
                y={panelY}
                width={panelW}
                height={panelH}
                onClose={close}
                onPickCount={startWith}
                onStop={stop}
                options={options}
                autoSpinRemaining={autoSpinRemaining}
            />
        </pixiContainer>
    );
}

/**
 * BackgroundClickBlocker
 *
 * Same idea as in `PaytablePopup`: invisible full-canvas
 * `eventMode="static"` rectangle that sits at the top of the
 * popup's z-stack and absorbs clicks so the underlying HUD
 * buttons can't fire. onClick is a no-op.
 */
function BackgroundClickBlocker({ width, height }) {
    const draw = useCallback(
        (g) => {
            g.clear();
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
                // swallow — popup stays open
            }}
        />
    );
}

/**
 * AutoSpinBackdrop
 *
 * Full-canvas tinted rectangle for visual separation. It is
 * intentionally NOT interactive — the auto-spin picker closes
 * only via the × button, Escape, or by picking a count / STOP
 * (matching `PaytablePopup` / `SettingsPopup`). No `eventMode`
 * → defaults to `passive`, so it doesn't intercept clicks.
 */
function AutoSpinBackdrop({ width, height }) {
    const draw = useCallback(
        (g) => {
            g.clear();
            g.beginFill(0x050a28, 0.6);
            g.drawRect(0, 0, width, height);
            g.endFill();
        },
        [width, height]
    );

    return <pixiGraphics draw={draw} />;
}

/**
 * AutoSpinPanel
 *
 * Centred card with header (title + ×) and one row per spin
 * count. The STOP row only renders while an auto-spin run is
 * already in progress — otherwise it'd be a dead button.
 */
function AutoSpinPanel({
    x,
    y,
    width,
    height,
    onClose,
    onPickCount,
    onStop,
    options,
    autoSpinRemaining,
}) {
    const drawPanel = useCallback(
        (g) => {
            g.clear();
            // Drop shadow.
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

    const headerH = 48;
    const rowH = 44;
    const rowGap = 6;
    const bodyX = 16;
    const bodyY = headerH + 16;
    const bodyW = width - bodyX * 2;

    return (
        <pixiContainer x={x} y={y}>
            <pixiGraphics draw={drawPanel} />

            <pixiText
                text="Auto Spin"
                x={20}
                y={24}
                anchor={{ x: 0, y: 0.5 }}
                style={{
                    fill: 0xf5f5f5,
                    fontSize: 18,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                }}
            />

            <CloseButton
                x={width - 28}
                y={24}
                onClick={onClose}
            />

            {/* Spin-count rows. */}
            {options.map((count, i) => (
                <AutoSpinRow
                    key={count}
                    x={bodyX}
                    y={bodyY + i * (rowH + rowGap)}
                    width={bodyW}
                    height={rowH}
                    label={`${count} SPINS`}
                    onClick={() => onPickCount(count)}
                />
            ))}

            {/* STOP row — only when an auto-spin run is active. */}
            {autoSpinRemaining > 0 && (
                <AutoSpinRow
                    x={bodyX}
                    y={
                        bodyY +
                        options.length * (rowH + rowGap) +
                        8
                    }
                    width={bodyW}
                    height={rowH}
                    label={`STOP (${autoSpinRemaining} left)`}
                    onClick={onStop}
                    stopStyle
                />
            )}
        </pixiContainer>
    );
}

/**
 * AutoSpinRow
 *
 * One tappable row in the panel. Renders a rounded background
 * rect with the label centred. Clicking the row invokes
 * `onClick`. `stopStyle` swaps the palette to a red accent so
 * the STOP row reads as a destructive action.
 */
function AutoSpinRow({ x, y, width, height, label, onClick, stopStyle = false }) {
    const drawRow = useCallback(
        (g) => {
            g.clear();
            // Fill + outline.
            g.beginFill(
                stopStyle ? 0xff4d4d : 0xffffff,
                stopStyle ? 0.18 : 0.04
            );
            g.drawRoundedRect(0, 0, width, height, 10);
            g.endFill();
            g.lineStyle({
                width: 1,
                color: stopStyle ? 0xff4d4d : 0xffffff,
                alpha: stopStyle ? 0.45 : 0.08,
            });
            g.drawRoundedRect(0, 0, width, height, 10);
        },
        [width, height, stopStyle]
    );

    const hitArea = useMemoHitArea(width, height);

    return (
        <pixiContainer x={x} y={y}>
            <pixiGraphics
                draw={drawRow}
                eventMode="static"
                cursor="pointer"
                hitArea={hitArea}
                onClick={onClick}
            />
            <pixiText
                text={label}
                x={width / 2}
                y={height / 2}
                anchor={0.5}
                style={{
                    fill: stopStyle ? 0xff8080 : 0xf5f5f5,
                    fontSize: 14,
                    fontWeight: "700",
                    letterSpacing: 1,
                }}
            />
        </pixiContainer>
    );
}

/**
 * CloseButton
 *
 * Round × button. Click closes the popup. Same wiring as in
 * `SettingsPopup` / `PaytablePopup`.
 */
function CloseButton({ x, y, onClick }) {
    const RADIUS = 14;
    const drawBg = useCallback((g) => {
        g.clear();
        g.lineStyle({ width: 1, color: 0xffffff, alpha: 0.18 });
        g.beginFill(0xffffff, 0.04);
        g.drawCircle(0, 0, RADIUS);
        g.endFill();
    }, []);

    const hitArea = useMemoHitArea(RADIUS * 2, RADIUS * 2, -RADIUS, -RADIUS);

    const wrappedClick = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log("[autospinpopup] close button pointertap");
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
                    fontSize: 20,
                    fontWeight: "700",
                }}
            />
        </pixiContainer>
    );
}

export default AutoSpinPopup;
