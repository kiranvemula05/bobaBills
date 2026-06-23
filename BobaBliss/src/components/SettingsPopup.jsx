import { useCallback, useEffect, useMemo, useState } from "react";
import { Rectangle } from "pixi.js";
import { useGameStore } from "../store/gameStore.js";
import audioBus from "./audioBus.js";
import ButtonSound from "./ButtonSound.js";
import SlotEngine from "../engine/SlotEngine.js";
import gameConfig from "../games/suger-rush/config.js";
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
 * SettingsPopup (Pixi)
 *
 * Renders the settings panel inside the Pixi canvas so it
 * visually lives "inside" the game frame. Sized to 40% × 40%
 * of the canvas, centred.
 *
 * Close behaviour (matches `PaytablePopup`)
 *  - Click the × button   → popup closes.
 *  - Press Escape         → popup closes.
 *
 * Backdrop click is intentionally NOT a close trigger — the
 * dimmed area is just a visual separator. Clicking outside the
 * panel does nothing, so the only way to dismiss the popup is
 * the × button (or Escape).
 *
 * Inside the panel, every interactive element (Sound pill,
 * volume − / + buttons) only mutates audio state and does NOT
 * close the popup. The panel's outer container has no
 * `eventMode`, defaults to `passive`, and the decorative
 * `pixiGraphics` / `pixiText` elements are also passive —
 * clicks on those areas do nothing.
 */
function SettingsPopup() {
    const open = useGameStore((s) => s.settingsOpen);
    const close = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log("[settingspopup] close()");
        useGameStore.setState({ settingsOpen: false });
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

    const panelW = Math.round(canvasW * 0.4);
    const panelH = Math.round(canvasH * 0.4);
    const panelX = Math.round((canvasW - panelW) / 2);
    const panelY = Math.round((canvasH - panelH) / 2);

    return (
        <pixiContainer>
            <SettingsBackdrop
                width={canvasW}
                height={canvasH}
            />
            <SettingsPanel
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
 * SettingsBackdrop
 *
 * Full-canvas tinted rectangle for visual separation. It is
 * intentionally NOT interactive — the settings popup closes
 * only via the × button (matching `PaytablePopup`'s behaviour).
 * No `eventMode` → defaults to `passive`, so it doesn't
 * intercept clicks.
 */
function SettingsBackdrop({ width, height }) {
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
 * SettingsPanel
 *
 * Framed panel + header + close button + body. Container is
 * `eventMode="none"` so it doesn't intercept clicks intended
 * for its children; only the interactive graphics (close button
 * circle, sound pill) are interactive.
 */
function SettingsPanel({ x, y, width, height, onClose }) {
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
            g.drawRoundedRect(0, 0, width, 38, 16);
            g.endFill();

            // Header bottom border.
            g.beginFill(0xffffff, 0.06);
            g.drawRect(0, 38, width, 1);
            g.endFill();

            // Border.
            g.lineStyle({ width: 1, color: 0xffffff, alpha: 0.08 });
            g.drawRoundedRect(0, 0, width, height, 16);
        },
        [width, height]
    );

    return (
        <pixiContainer x={x} y={y}>
            <pixiGraphics draw={drawPanel} />

            <pixiText
                text="Settings"
                x={14}
                y={19}
                anchor={{ x: 0, y: 0.5 }}
                style={{
                    fill: 0xf5f5f5,
                    fontSize: 16,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                }}
            />

            <CloseButton
                x={width - 28}
                y={19}
                onClick={onClose}
            />

            {/* Body sits below the header band (38px). */}
            <pixiContainer x={14} y={50}>
                <SoundRow width={width - 28} />
                <VolumeRow width={width - 28} />
                <AutoSpinRow width={width - 28} />
            </pixiContainer>
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
 * Uses the codebase's standard Pixi event bindings:
 *   - `eventMode="static"`
 *   - `cursor="pointer"`
 *   - `onClick={handler}`   (maps to Pixi's `pointertap`)
 *   - `hitArea={Rectangle(...)}`
 *
 * `onClick` here receives the close function directly. We do
 * NOT play the settings click sound on close — closing is its
 * own quiet action.
 */
function CloseButton({ x, y, onClick }) {
    const RADIUS = 16;
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
        console.log("[settingspopup] close button pointertap");
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
                    fontSize: 22,
                    fontWeight: "700",
                }}
            />
        </pixiContainer>
    );
}

/**
 * SoundRow
 *
 * One settings row inside the panel: a "Sound" label + status
 * hint on the left, an on/off toggle pill on the right. The
 * pill is a Graphics rect whose fill colour + thumb position
 * flip based on `audioBus` state.
 *
 * The row also subscribes to the master `volume` so it can
 * render the live "muted" appearance when the volume bar is at
 * 0% — both states flip the pill to "Muted" so the user gets
 * consistent feedback regardless of which control muted the
 * audio.
 */
function SoundRow({ width, y = 0 }) {
    const [paused, setPaused] = useState(() => audioBus.isPaused());
    const [volume, setVolume] = useState(() => audioBus.getVolume());

    useEffect(
        () =>
            audioBus.subscribe(({ paused: p, volume: v }) => {
                setPaused(p);
                setVolume(v);
            }),
        []
    );

    // Either explicit pause (Sound pill / HUD Sound button) or
    // a 0% master volume reads as muted. The two states are
    // equivalent for the user — both silence audio — and the
    // pill should reflect that consistently.
    const muted = paused || volume <= 0;

    const rowHeight = 44;
    const pillW = 50;
    const pillH = 26;

    const drawPill = useCallback(
        (g) => {
            g.clear();
            g.beginFill(muted ? 0xffffff : 0x34c759, muted ? 0.16 : 1);
            g.drawRoundedRect(0, 0, pillW, pillH, pillH / 2);
            g.endFill();
        },
        [muted]
    );

    const drawThumb = useCallback((g) => {
        g.clear();
        g.beginFill(0xffffff);
        g.drawCircle(0, 0, 10);
        g.endFill();
    }, []);

    const toggle = () => {
        // Toggling the pill always flips the explicit paused
        // flag. If we're unmuting from a 0% volume, also bump
        // volume up to a small audible level so the user can
        // actually hear the result of their unmute click — a
        // bare un-pause at 0% would leave them in silence.
        if (paused) {
            audioBus.resume();
            if (audioBus.getVolume() <= 0) audioBus.setVolume(0.5);
        } else {
            audioBus.pause();
        }
    };

    const pillHitArea = useMemoHitArea(pillW, pillH);

    return (
        <pixiContainer y={y}>
            <pixiGraphics
                draw={(g) => {
                    g.clear();
                    g.beginFill(0xffffff, 0.04);
                    g.drawRoundedRect(0, 0, width, rowHeight, 10);
                    g.endFill();
                    g.lineStyle({ width: 1, color: 0xffffff, alpha: 0.06 });
                    g.drawRoundedRect(0, 0, width, rowHeight, 10);
                }}
            />
            <pixiText
                text="Sound"
                x={14}
                y={15}
                style={{
                    fill: 0xf5f5f5,
                    fontSize: 13,
                    fontWeight: "700",
                }}
            />
            <pixiText
                text={muted ? "Muted" : "On"}
                x={14}
                y={28}
                style={{
                    fill: 0xf5f5f5,
                    fontSize: 9,
                    letterSpacing: 1,
                    fontWeight: "600",
                }}
            />

            {/* Toggle pill on the right. Same wiring as the rest
               of the codebase: `eventMode="static"` +
               `cursor="pointer"` + `pointertap` + explicit
               `hitArea`. */}
            <pixiGraphics
                x={width - pillW - 10}
                y={(rowHeight - pillH) / 2}
                draw={drawPill}
                eventMode="static"
                cursor="pointer"
                hitArea={pillHitArea}
                onClick={() => {
                    ButtonSound.play("sound");
                    toggle();
                }}
            />
            <pixiGraphics
                x={width - pillW - 10 + (muted ? pillW - 13 : 13)}
                y={(rowHeight - pillH) / 2 + pillH / 2}
                draw={drawThumb}
            />
        </pixiContainer>
    );
}

/**
 * VolumeRow
 *
 * Master volume row inside the settings panel. − and + buttons
 * adjust the audioBus master scalar in [0, 1] in 10% steps.
 *
 * Visual elements
 *  - "Volume" label + current percentage (e.g. `80%`).
 *  - − and + buttons on the right.
 *  - A horizontal volume bar that fills from 0% → 100% of its
 *    track as the master scalar increases. The bar sits in
 *    the middle band of the row so it stays visible above and
 *    below the row's vertical bounds.
 *
 * Coupling with the Sound toggle
 *  - When the master volume reaches 0, the audio bus treats
 *    that as muted (see `audioBus.setVolume` and the bus state
 *    derivations below) and the SoundRow's pill flips to its
 *    "Muted" appearance automatically. Going back above 0
 *    flips it back to "On".
 *  - Conversely, if the user toggles the SoundRow pill to
 *    "Muted", master volume stays at its current scalar but
 *    is "suppressed" by the paused flag; toggling back to "On"
 *    unsuppresses it. This matches the behaviour the user
 *    described: a 0% volume keeps the toggle pinned to Mute,
 *    and bumping volume back above 0 un-mutes it.
 */
function VolumeRow({ width, y = 50 }) {
    const [volume, setVolume] = useState(() => audioBus.getVolume());
    const [paused, setPaused] = useState(() => audioBus.isPaused());

    useEffect(
        () =>
            audioBus.subscribe(({ volume: v, paused: p }) => {
                setVolume(v);
                setPaused(p);
            }),
        []
    );

    const rowHeight = 44;
    const btnSize = 30;

    const STEP = 0.1;
    const clamp = (v) => Math.max(0, Math.min(1, v));

    const decrease = () => {
        const next = clamp(volume - STEP);
        if (next === volume) return;
        audioBus.setVolume(next);
        // Pin the SoundRow to Muted when volume hits 0 so the
        // toggle reads consistently with the bar.
        if (next === 0 && !paused) audioBus.pause();
        ButtonSound.play("sound");
    };
    const increase = () => {
        const next = clamp(volume + STEP);
        if (next === volume) return;
        audioBus.setVolume(next);
        // Un-mute when the user brings volume back above 0.
        if (next > 0 && paused) audioBus.resume();
        ButtonSound.play("sound");
    };

    // − button sits just to the left of the volume bar, +
    // sits just to its right — they flank the bar. Volume %
    // text still anchors to the far-left of the row.
    const rowLeftPad = 14;
    const labelBlockW = 56; // width reserved for the "Volume" / "XX%" label
    const barSidePad = 8;   // breathing room between each button and the bar

    const drawBtn = (g, disabled) => {
        g.clear();
        g.lineStyle({ width: 1, color: 0xffffff, alpha: disabled ? 0.06 : 0.18 });
        g.beginFill(0xffffff, disabled ? 0.02 : 0.06);
        g.drawRoundedRect(0, 0, btnSize, btnSize, 8);
        g.endFill();
    };

    const btnHitArea = useMemoHitArea(btnSize, btnSize);
    const minusDisabled = volume <= 0;
    const plusDisabled = volume >= 1;

    const pct = Math.round(volume * 100);

    const barH = 6;
    const barY = (rowHeight - barH) / 2 + 2;

    const minusX = rowLeftPad + labelBlockW;
    const plusX = width - btnSize - 10;
    const barX = minusX + btnSize + barSidePad;
    const barW = Math.max(40, plusX - barSidePad - barX);
    const fillW = Math.round(barW * volume);

    return (
        <pixiContainer y={y}>
            <pixiGraphics
                draw={(g) => {
                    g.clear();
                    g.beginFill(0xffffff, 0.04);
                    g.drawRoundedRect(0, 0, width, rowHeight, 10);
                    g.endFill();
                    g.lineStyle({ width: 1, color: 0xffffff, alpha: 0.06 });
                    g.drawRoundedRect(0, 0, width, rowHeight, 10);
                }}
            />
            <pixiText
                text="Volume"
                x={14}
                y={15}
                style={{
                    fill: 0xf5f5f5,
                    fontSize: 13,
                    fontWeight: "700",
                }}
            />
            <pixiText
                text={`${pct}%`}
                x={14}
                y={28}
                style={{
                    fill: 0xf5f5f5,
                    fontSize: 9,
                    letterSpacing: 1,
                    fontWeight: "600",
                }}
            />

            {/* Volume bar — empty track + filled portion. The
               fill colour shifts toward red as volume drops to
               0 so the empty state reads visually as "muted". */}
            <pixiGraphics
                draw={(g) => {
                    g.clear();
                    // Empty track.
                    g.beginFill(0xffffff, 0.08);
                    g.drawRoundedRect(barX, barY, barW, barH, barH / 2);
                    g.endFill();
                    // Filled portion.
                    if (fillW > 0) {
                        const fillColor =
                            volume <= 0
                                ? 0xff4d4d
                                : 0x34c759;
                        g.beginFill(fillColor, 1);
                        g.drawRoundedRect(
                            barX,
                            barY,
                            fillW,
                            barH,
                            barH / 2
                        );
                        g.endFill();
                    }
                }}
            />

            {/* − button. Disabled visually + interactively at 0%. */}
            <pixiContainer x={minusX} y={(rowHeight - btnSize) / 2}>
                <pixiGraphics
                    draw={(g) => drawBtn(g, minusDisabled)}
                    eventMode={minusDisabled ? "none" : "static"}
                    cursor={minusDisabled ? "default" : "pointer"}
                    hitArea={btnHitArea}
                    onClick={decrease}
                />
                <pixiText
                    text="−"
                    x={btnSize / 2}
                    y={btnSize / 2}
                    anchor={0.5}
                    style={{
                        fill: minusDisabled ? 0x666666 : 0xf5f5f5,
                        fontSize: 18,
                        fontWeight: "700",
                    }}
                />
            </pixiContainer>

            {/* + button. Disabled visually + interactively at 100%. */}
            <pixiContainer x={plusX} y={(rowHeight - btnSize) / 2}>
                <pixiGraphics
                    draw={(g) => drawBtn(g, plusDisabled)}
                    eventMode={plusDisabled ? "none" : "static"}
                    cursor={plusDisabled ? "default" : "pointer"}
                    hitArea={btnHitArea}
                    onClick={increase}
                />
                <pixiText
                    text="+"
                    x={btnSize / 2}
                    y={btnSize / 2}
                    anchor={0.5}
                    style={{
                        fill: plusDisabled ? 0x666666 : 0xf5f5f5,
                        fontSize: 18,
                        fontWeight: "700",
                    }}
                />
            </pixiContainer>
        </pixiContainer>
    );
}

/**
 * Resolve the canvas size for any future sizing logic. Reads
 * from the layout config; falls back to 1280×720.
 */
function getCanvasSize() {
    const stage = gameConfig?.layout?.stage;
    return {
        width: typeof stage?.width === "number" ? stage.width : 1280,
        height: typeof stage?.height === "number" ? stage.height : 720,
    };
}

export default SettingsPopup;
export { getCanvasSize };

/**
 * AutoSpinRow
 *
 * Third settings row inside the panel. Mirrors the
 * AutoSpinPopup picker so the user can start / stop an auto-spin
 * run without leaving the settings dialog.
 *
 * Visual elements
 *  - "Auto Spin" label + status hint on the left
 *    ("RUNNING (N left)" or "IDLE").
 *  - One chip per `gameConfig.layout.autoSpin.options` value
 *    (10 / 25 / 50 / 100). Picking a chip calls
 *    `SlotEngine.startAutoSpin(count)` and the row stays on
 *    "RUNNING" until the engine finishes the run.
 *  - When an auto-spin run is already active a single red
 *    STOP chip renders in place of the count chips. Clicking
 *    STOP calls `SlotEngine.stopAutoSpin()`.
 *
 * Reads `autoSpinRemaining` from the Zustand store so the chips
 * re-render every time the engine ticks the counter down.
 * Picking a chip closes the popup so the GameMessage strip can
 * show the live "SPIN X / Y" overlay without the popup in the
 * way.
 */
function AutoSpinRow({ width, y = 100 }) {
    const autoSpinRemaining = useGameStore((s) => s.autoSpinRemaining);
    const autoSpinActive = autoSpinRemaining > 0;

    const options = useMemo(
        () => gameConfig?.layout?.autoSpin?.options ?? [10, 25, 50, 100],
        []
    );

    const startWith = (count) => {
        ButtonSound.play("autoSpin");
        SlotEngine.startAutoSpin(count);
        // Close the settings popup so the player can see the
        // spin counter on the GameMessage strip below the
        // BoardFrame. Same UX as picking a count in
        // AutoSpinPopup.
        useGameStore.setState({ settingsOpen: false });
    };

    const stop = () => {
        ButtonSound.play("autoSpin");
        SlotEngine.stopAutoSpin();
    };

    const rowHeight = 44;
    const chipGap = 6;
    const chipW = 44;
    const chipH = 28;

    // The chips are right-aligned with a 10 px gutter, mirroring
    // the SoundRow pill and the VolumeRow − / + buttons.
    const totalChipW =
        options.length * chipW + (options.length - 1) * chipGap;
    const chipsStartX = width - totalChipW - 10;

    return (
        <pixiContainer y={y}>
            {/* Row background, same shape as SoundRow / VolumeRow. */}
            <pixiGraphics
                draw={(g) => {
                    g.clear();
                    g.beginFill(0xffffff, 0.04);
                    g.drawRoundedRect(0, 0, width, rowHeight, 10);
                    g.endFill();
                    g.lineStyle({ width: 1, color: 0xffffff, alpha: 0.06 });
                    g.drawRoundedRect(0, 0, width, rowHeight, 10);
                }}
            />
            <pixiText
                text="Auto Spin"
                x={14}
                y={15}
                style={{
                    fill: 0xf5f5f5,
                    fontSize: 13,
                    fontWeight: "700",
                }}
            />
            <pixiText
                text={
                    autoSpinActive
                        ? `RUNNING (${autoSpinRemaining} LEFT)`
                        : "IDLE"
                }
                x={14}
                y={28}
                style={{
                    fill: autoSpinActive ? 0x34c759 : 0xf5f5f5,
                    fontSize: 9,
                    letterSpacing: 1,
                    fontWeight: "600",
                }}
            />

            {/* Count chips or STOP chip on the right. */}
            {autoSpinActive ? (
                <StopChip
                    x={chipsStartX}
                    y={(rowHeight - chipH) / 2}
                    width={totalChipW}
                    height={chipH}
                    remaining={autoSpinRemaining}
                    onClick={stop}
                />
            ) : (
                options.map((count, i) => (
                    <CountChip
                        key={count}
                        x={chipsStartX + i * (chipW + chipGap)}
                        y={(rowHeight - chipH) / 2}
                        width={chipW}
                        height={chipH}
                        label={String(count)}
                        onClick={() => startWith(count)}
                    />
                ))
            )}
        </pixiContainer>
    );
}

/**
 * CountChip
 *
 * Single tappable chip that starts an auto-spin run with a
 * specific count. Mirrors the `AutoSpinRow` chip from the
 * `AutoSpinPopup` so the two pickers are visually identical.
 */
function CountChip({ x, y, width, height, label, onClick }) {
    const drawChip = useCallback(
        (g) => {
            g.clear();
            g.lineStyle({ width: 1, color: 0xffffff, alpha: 0.18 });
            g.beginFill(0xffffff, 0.06);
            g.drawRoundedRect(0, 0, width, height, 8);
            g.endFill();
        },
        [width, height]
    );

    const hitArea = useMemoHitArea(width, height);

    return (
        <pixiContainer x={x} y={y}>
            <pixiGraphics
                draw={drawChip}
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
                    fill: 0xf5f5f5,
                    fontSize: 13,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                }}
            />
        </pixiContainer>
    );
}

/**
 * StopChip
 *
 * Wide red chip rendered in place of the count chips while an
 * auto-spin run is in progress. Shows the remaining spin count
 * inline and ends the run on click.
 */
function StopChip({ x, y, width, height, remaining, onClick }) {
    const drawChip = useCallback(
        (g) => {
            g.clear();
            g.lineStyle({ width: 1, color: 0xff4d4d, alpha: 0.45 });
            g.beginFill(0xff4d4d, 0.18);
            g.drawRoundedRect(0, 0, width, height, 8);
            g.endFill();
        },
        [width, height]
    );

    const hitArea = useMemoHitArea(width, height);

    return (
        <pixiContainer x={x} y={y}>
            <pixiGraphics
                draw={drawChip}
                eventMode="static"
                cursor="pointer"
                hitArea={hitArea}
                onClick={onClick}
            />
            <pixiText
                text={`STOP (${remaining} LEFT)`}
                x={width / 2}
                y={height / 2}
                anchor={0.5}
                style={{
                    fill: 0xff8080,
                    fontSize: 12,
                    fontWeight: "700",
                    letterSpacing: 1,
                }}
            />
        </pixiContainer>
    );
}