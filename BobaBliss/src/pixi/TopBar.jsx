import { useEffect, useState } from "react";
import { Assets } from "pixi.js";
import gameConfig from "../games/suger-rush/config.js";
import ButtonSound from "../components/ButtonSound.js";

/**
 * Format a Date as a zero-padded HH:MM string in 24-hour time.
 * Used by the TopBar clock label so the leading zeros line up
 * regardless of the current minute/hour.
 */
function formatClock(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

/**
 * TopBar (Pixi)
 *
 * Renders the top bar background as a tinted Pixi graphics rectangle
 * and the title text as Pixi text. Lives inside the Pixi stage so it
 * shares the canvas coordinate system with BetPanel/SettingsButton.
 *
 * The TopBar preloads both the lobby-button texture (used for the
 * interactive `LOBBY` chip on the left) AND the clock icon
 * (rendered immediately before the `12:00` clock text on the
 * left). Both textures are loaded in parallel so the bar never
 * pops in late.
 */
function TopBar() {
    const layout = gameConfig.layout.topBar;
    const [lobbyTexture, setLobbyTexture] = useState(null);
    const [clockTexture, setClockTexture] = useState(null);
    const [searchBarTexture, setSearchBarTexture] = useState(null);
    const [clockTime, setClockTime] = useState(() => formatClock(new Date()));

    const lobbyUrl = gameConfig.assets.ui.lobbyButton;
    const clockIconUrl = gameConfig.assets.ui.clockIcon;
    const searchBarUrl = gameConfig.assets.ui.searchBar;

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            Assets.load(lobbyUrl).catch((err) => {
                // eslint-disable-next-line no-console
                console.error("LobbyButton texture load failed", err);
                return null;
            }),
            Assets.load(clockIconUrl).catch((err) => {
                // eslint-disable-next-line no-console
                console.error("ClockIcon texture load failed", err);
                return null;
            }),
            Assets.load(searchBarUrl).catch((err) => {
                // eslint-disable-next-line no-console
                console.error("SearchBar texture load failed", err);
                return null;
            }),
        ]).then(([lobby, clock, search]) => {
            if (cancelled) return;
            setLobbyTexture(lobby);
            setClockTexture(clock);
            setSearchBarTexture(search);
        });
        return () => {
            cancelled = true;
        };
    }, [lobbyUrl, clockIconUrl, searchBarUrl]);

    // Tick the clock every second so the `HH:MM` label on
    // the left chip reads as a live wall clock rather than a
    // static placeholder. The interval is cleared when the
    // TopBar unmounts so it doesn't leak into the next game.
    useEffect(() => {
        const id = setInterval(() => {
            setClockTime(formatClock(new Date()));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    if (!lobbyTexture || !clockTexture || !searchBarTexture) return null;



    return (
        <pixiContainer>
            <pixiGraphics
                draw={(g) => {
                    g.clear();
                    g.beginFill(layout.backgroundColor, layout.backgroundAlpha);
                    g.drawRect(0, 0, layout.width, layout.height);
                    g.endFill();
                }}
            />

            <pixiText
                text={layout.title.label}
                x={
                    layout.gameTitleBackground.x +
                    layout.gameTitleBackground.width / 2
                }
                y={
                    layout.gameTitleBackground.y +
                    layout.gameTitleBackground.height / 2
                }
                anchor={0.5}
                style={{
                    fill: layout.title.labelColor,
                    fontSize: layout.title.fontSize,
                    fontWeight: "700",
                    letterSpacing: 1,
                }}
            />

            {/* Game-id chip on the right. Uses the same LobbyButton
               art as a background pill so the chip reads as a
               styled container rather than a floating label.
               Sized to fully cover the rounded rectangle that
               fits the centered `gameIdText` glyphs. */}
            <pixiSprite
                texture={lobbyTexture}
                x={layout.gameIdBackground.x}
                y={layout.gameIdBackground.y}
                width={layout.gameIdBackground.width}
                height={layout.gameIdBackground.height}
            />

            <pixiText
                text={layout.gameId.label}
                x={
                    layout.gameIdBackground.x +
                    layout.gameIdBackground.width / 2
                }
                y={
                    layout.gameIdBackground.y +
                    layout.gameIdBackground.height / 2
                }
                anchor={0.5}
                style={{
                    fill: layout.gameId.labelColor,
                    fontSize: layout.gameId.fontSize,
                    fontWeight: "700",
                }}
            />

            {/* Clock icon + label on the left. The icon sits
               immediately before the text so the row reads as
               `[icon] 12:00`. Icon asset URL and position come
               from `layout.topBar.clockIcon` and
               `assets.ui.clockIcon` in gameConfig. */}
            <pixiSprite
                texture={clockTexture}
                x={layout.clockIcon.x}
                y={layout.clockIcon.y}
                width={layout.clockIcon.width}
                height={layout.clockIcon.height}
            />
            <pixiText
                text={clockTime}
                x={layout.clock.x}
                y={layout.clock.y}
                anchor={0.5}
                style={{
                    fill: layout.clock.color,
                    fontSize: layout.clock.fontSize,
                    fontWeight: "700",
                }}
            />

            {/* Lobby button as a styled Pixi rectangle + label. */}
            <pixiSprite
                texture={lobbyTexture}
                x={layout.lobbyButton.x}
                y={layout.lobbyButton.y}
                width={layout.lobbyButton.width}
                height={layout.lobbyButton.height}
                eventMode="static"
                cursor="pointer"
                pointertap={() => {
                    ButtonSound.play("lobby");
                    console.log("Lobby Clicked");
                }}
            />

            {/* Search bar sprite between the lobby chip and
               the centered game title. Plain visual only — no
               input handling (Pixi canvases can't take native
               text input reliably); tapping is a no-op. */}
            <pixiSprite
                texture={searchBarTexture}
                x={layout.searchBar.x}
                y={layout.searchBar.y}
                width={layout.searchBar.width}
                height={layout.searchBar.height}
            />

            <pixiText
                text={layout.lobbyButton.label}
                x={
                    layout.lobbyButton.x +
                    layout.lobbyButton.width / 2
                }
                y={
                    layout.lobbyButton.y +
                    layout.lobbyButton.height / 2
                }
                anchor={0.5}
                style={{
                    fill: layout.lobbyButton.labelColor,
                    fontSize: layout.lobbyButton.fontSize,
                    fontWeight: "700",
                }}
            />
        </pixiContainer>
    );
}

export default TopBar;