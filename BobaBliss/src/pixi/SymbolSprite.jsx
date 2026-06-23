import { useEffect, useRef, useState } from "react";
import { Assets, Texture } from "pixi.js";
import gsap from "gsap";
import {
    CELL_SIZE_X,
    CELL_SIZE_Y,
    GRID_OFFSET,
    SYMBOL_TEXTURES,
    SYMBOL_FALLBACK_COLOR,
    gameConfig,
} from "./symbolRegistry.js";
import Preloader from "../loaders/Preloader.js";
import { useEventBusEffect } from "../hooks/useEventBus.js";
import { useGameStore } from "../store/gameStore.js";

/**
 * SymbolSprite
 *
 * Renders a single grid cell. PixiJS 8's <pixiSprite> needs a
 * real `Texture` object, not a URL. The preloader has already
 * walked the symbol URLs by the time the game mounts, so most
 * textures are already in Pixi's asset cache; we look them up
 * synchronously via `Assets.get(url)` (Pixi v8 normalises cache
 * keys to fully-qualified URLs, so `Assets.cache.get(url)` with
 * the path-only URL we pass to `Assets.load` returns undefined —
 * `Assets.get` handles that normalisation for us). On a miss we
 * fall back to `Preloader.getTypedTexture("symbol", symbol)` to
 * keep the URL→symbol mapping in one place.
 *
 * The texture-load effect depends on `symbol` so the sprite picks
 * up a new symbol's texture when the cascade drops a different
 * symbol into this cell. Texture instances are deduplicated by
 * reference equality, so re-asking for the same symbol is a no-op.
 */

/**
 * Resolve the reel-spin tween config for the current spin mode.
 *
 * Picks the auto-spin override when an auto-spin run is active
 * (so a long 25-spin run uses the slower, more deliberate reel
 * drop), otherwise falls through to the manual-spin default.
 * Auto-spin override is opt-in: any field missing from the
 * override block is read from the root `animation.reelSpin`.
 */
function resolveReelSpinCfg() {
    const anim = gameConfig?.animation ?? {};
    const manual = anim.reelSpin ?? {};
    const auto = anim.autoSpin?.reelSpin;
    if (!auto) return manual;
    // Shallow merge so designers can override just one field
    // (e.g. only `duration`) without restating every property.
    const merged = { ...manual, ...auto };
    if (auto.stagger) {
        merged.stagger = { ...(manual.stagger ?? {}), ...auto.stagger };
    }
    return merged;
}
function SymbolSprite({ symbol, row, col, isWinning = false }) {
    const url = SYMBOL_TEXTURES[symbol];
    const [texture, setTexture] = useState(() =>
        url ? Assets.get(url) ?? null : null
    );
    const grid = gameConfig.layout.grid;
    const SYMBOL_SIZE = grid.spriteSize;
    const x = GRID_OFFSET.x + col * CELL_SIZE_X + CELL_SIZE_X / 2;
    const y = GRID_OFFSET.y + row * CELL_SIZE_Y + CELL_SIZE_Y / 2;
    const color = SYMBOL_FALLBACK_COLOR[symbol] ?? 0xffffff;
    const spriteRef = useRef(null);

    // Reel-spin tween: when a new spin starts, animate each
    // sprite into its resting position using the GSAP config
    // defined in gameConfig.animation.reelSpin. Stagger is driven
    // by the configured axis (col, row, or diag) so the motion
    // reads as a row of reels snapping into place.
    //
    // NOTE: deps include `symbol` so a cell whose content
    // changes (cascade) gets a fresh closure bound to its new
    // rest position. Without `symbol` in deps the listener is
    // captured against the old symbol/symbol-derived references
    // and may run with a stale `y` after a cascade — which is
    // exactly what was making subsequent spins look frozen.
    useEventBusEffect("SPIN_START", () => {
        const node = spriteRef.current;
        if (!node) return;

        const cfg = resolveReelSpinCfg();
        const restY = y;
        const startY = restY + cfg.offsetY * CELL_SIZE_Y;
        node.y = startY;
        node.alpha = cfg.startAlpha;

        const { axis, perStep } = cfg.stagger;
        const stepIndex =
            axis === "row" ? row :
                axis === "diag" ? row + col :
                    col;

        gsap.to(node, {
            y: restY,
            alpha: 1,
            duration: cfg.duration,
            ease: cfg.ease,
            delay: stepIndex * perStep,
            onStart: () => {
                // The reel-spin tween is starting. Flip the store
                // flag so the SpinButton can lock itself out for
                // the duration of the visible drop.
                useGameStore.getState().setReelSpinning(true);
            },
            onComplete: () => {
                // The last sprite's tween has settled. Clear the
                // lock so the player can spin / stop again.
                // We defer one frame so any sibling sprites with a
                // late perStep delay don't race the clear.
                requestAnimationFrame(() => {
                    useGameStore.getState().setReelSpinning(false);
                });
            },
        });
    }, [y, col, row, symbol]);

    useEffect(() => {
        if (!symbol || !url) {
            setTexture(null);
            return undefined;
        }
        // Synchronous cache hit. The preloader warms Pixi's asset
        // cache for every symbol URL during the loading phase, so
        // on a normal mount this returns the cached `Texture`
        // immediately and we don't issue a redundant fetch.
        const cached = Assets.get(url);
        if (cached instanceof Texture) {
            setTexture((prev) => (prev === cached ? prev : cached));
            return undefined;
        }
        // Cache miss on first render is normal: the preloader
        // hasn't started yet (we suspend the parent until it has,
        // but SymbolSprite can be reached by a different render
        // path that bypasses the Suspense gate). Load it now via
        // the typed accessor — Preloader.preload() is implicitly
        // awaited inside `waitForAsset`.
        let cancelled = false;
        Preloader.waitForAsset(url)
            .then((tex) => {
                if (cancelled) return;
                if (tex instanceof Texture) {
                    setTexture((prev) => (prev === tex ? prev : tex));
                } else {
                    setTexture(null);
                }
            })
            .catch(() => {
                if (!cancelled) setTexture(null);
            });
        return () => {
            cancelled = true;
        };
    }, [symbol, url]);

    if (texture) {
        return (
            <pixiSprite
                ref={spriteRef}
                texture={texture}
                x={x}
                y={y}
                width={SYMBOL_SIZE}
                height={SYMBOL_SIZE}
                anchor={0.5}
                tint={isWinning ? gameConfig.layout.grid.winningTint : 0xffffff}
            />
        );
    }

    return (
        <pixiContainer x={x} y={y}>
            <pixiText
                text={symbol ? symbol[0] : "·"}
                x={0}
                y={0}
                style={{
                    fill: color,
                    fontSize: gameConfig.layout.grid.fallbackFontSize,
                    fontWeight: "700",
                    align: "center",
                }}
                anchor={0.5}
            />
        </pixiContainer>
    );
}

export default SymbolSprite;