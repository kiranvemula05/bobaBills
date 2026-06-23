const gameConfig = {
    id: "sugar-rush",

    name: "Sugar Rush Inspired",

    // Grid Configuration
    rows: 7,
    cols: 7,

    // Cluster Pays
    winType: "CLUSTER",

    minClusterSize: 8,

    // Betting
    minBet: 1,
    maxBet: 1000,
    defaultBet: 10,

    // Symbols
    symbols: [
        "RED_CANDY",
        "BLUE_CANDY",
        "GREEN_CANDY",
        "YELLOW_CANDY",
        "PURPLE_CANDY",
        "ORANGE_CANDY",
        "SCATTER"
    ],

    // RNG Weights
    symbolWeights: {
        RED_CANDY: 20,
        BLUE_CANDY: 20,
        GREEN_CANDY: 20,
        YELLOW_CANDY: 15,
        PURPLE_CANDY: 15,
        ORANGE_CANDY: 8,
        SCATTER: 2
    },

    // Features
    features: {
        clusterPays: true,
        cascading: true,
        multipliers: true,
        freeSpins: true,
        autoSpin: true,
        turboMode: true,
        jackpot: false
    },

    // Multipliers
    multipliers: {
        enabled: true,
        levels: [1, 2, 4, 8, 16, 32, 64, 128],
        maxMultiplier: 128
    },

    // Free Spins
    freeSpins: {
        triggerScatters: 4,

        awards: {
            4: 10,
            5: 12,
            6: 15,
            7: 20
        },

        multiplierPersistence: true
    },

    // GameMessage strip
    //
    // `welcome` is the text the strip displays when no
    // auto-spin or free-spin overlay is active. Set it to
    // whatever the branding calls for; falls back to
    // "Welcome to BOBA Bliss" if the key is missing.
    gameMessage: {
        welcome: "Welcome to BOBA Bliss"
    },

    // Auto Spin
    autoSpin: {
        enabled: true,

        options: [
            10,
            25,
            50,
            100
        ],

        stopOnBonus: true,
        stopOnBigWin: true,
        stopOnBalanceLow: true
    },

    // Animation Timings
    //
    // Two parallel blocks so manual spins and auto-spin can feel
    // different. Every key in `animation.reelSpin` /
    // `animation.cascadeDuration` / `animation.spinDuration` is
    // the **manual-spin** default. The `animation.autoSpin`
    // block mirrors the same shape and **overrides** the manual
    // defaults while an auto-spin run is active.
    //
    // Why this split
    // --------------
    //  - Manual spins should feel snappy and rewarding — the
    //    user is sitting on the Spin button and wants feedback.
    //  - Auto-spin runs for many rounds; even a 500 ms gap
    //    between rounds reads as a frantic blur after 25 spins.
    //    Slowing each phase gives the player time to register
    //    wins and losses, and avoids burning battery / GPU
    //    while no one is actively watching.
    //
    // Lookup order (see `resolveAnimation()` in
    // `engine/SpinManager.js` and `resolveReelSpinCfg()` in
    // `pixi/SymbolSprite.jsx`):
    //   1. autoSpin override (when an auto-spin run is active)
    //   2. animation root (manual-spin default)
    animation: {
        // Manual-spin defaults. Used unless an auto-spin run is
        // active. Tuned for snappy feedback while the player is
        // actively pressing the Spin button — round reads as a
        // quick "snap" rather than a slow drop. See the
        // `autoSpin` block below for the slower variant used
        // while an auto-run is in flight.
        spinDuration: 700,
        cascadeDuration: 250,
        winDuration: 1200,
        multiplierDuration: 250,

        // Reel-spin tween (GSAP). Each sprite drops one cell from
        // above its resting position into place on SPIN_START.
        reelSpin: {
            duration: 0.3,
            ease: "power2.out",
            offsetY: -1,            // cells above the resting spot
            startAlpha: 0.25,
            stagger: {
                axis: "col",        // "col" | "row" | "diag"
                perStep: 0.02       // seconds per index step
            }
        },

        // Auto-spin overrides. Same shape as the root keys above
        // — any subset can be overridden; missing keys fall
        // through to the root value via `resolveAnimation`.
        autoSpin: {
            // Slower engine window so cascades breathe.
            spinDuration: 1600,
            cascadeDuration: 700,
            winDuration: 2200,
            multiplierDuration: 500,

            // Longer per-sprite drop with a more pronounced
            // stagger — last cell lands at ~1.5 s instead of
            // ~0.75 s, so each round's reel snap reads even
            // when the player isn't focused on the screen.
            reelSpin: {
                duration: 0.8,
                ease: "power2.out",
                offsetY: -1,
                startAlpha: 0.25,
                stagger: {
                    axis: "col",
                    perStep: 0.1
                }
            },

            // Gap between auto-spin rounds. `SpinManager.startSpin`
            // reads this instead of the hard-coded 500 ms it used
            // to use, so designers can tune the pacing of long
            // auto runs without touching engine code.
            interRoundDelay: 1500
        }
    },

    // Audio
    //
    // Every audio source in the game lives under `audio.*` and
    // uses the same `{ enabled, src, volume, loop }` shape so the
    // sound design is data-driven and uniform. `loop` is a
    // boolean — `true` for sustained tracks (BGM, ambient
    // effects), `false` for one-shot SFX (clicks, win chimes).
    //
    //   audio: {
    //       enabled: true,                       // global kill-switch
    //       volume: 0.8,                         // default volume for any
    //                                           // entry that omits its own
    //
    //       backgroundMusic: { enabled, src, volume, loop: true },
    //       spin:            { enabled, src, volume, loop: false },
    //       win:             { enabled, src, volume, loop: false },
    //       scatter:         { enabled, src, volume, loop: false },
    //       bonus:           { enabled, src, volume, loop: false },
    //
    //       // Per-button click sounds. Each key is a button id;
    //       // value is `{ enabled, src, volume, loop }`. Set any
    //       // `enabled` to `false` to silence that specific button.
    //       buttons: {
    //           default:  { enabled, src, volume, loop: false },
    //           spin:     { enabled, src, volume, loop: false },
    //           lobby:    { enabled: false },    // <- silent lobby
    //           paytable: { enabled, src, volume, loop: false },
    //           settings: { enabled, src, volume, loop: false },
    //           sound:    { enabled, src, volume, loop: false },
    //           autoSpin: { enabled, src, volume, loop: false },
    //           betPlus:  { enabled, src, volume, loop: false },
    //           betMinus: { enabled, src, volume, loop: false },
    //       },
    //   }
    //
    // Anywhere an `enabled` flag exists, setting it to `false`
    // silences that specific source. Missing files (404 / broken
    // URL) are swallowed silently — no console errors.
    audio: {
        // Global kill-switch + default volume for any audio
        // source that doesn't specify its own. Per-entry
        // `enabled: false` still wins for individual sources.
        enabled: true,
        volume: 0.8,
        // Default `loop` for any entry that omits its own.
        // One-shot SFX override to false; BGM overrides to true.
        loop: false,

        // ── Background music ────────────────────────────────────────
        backgroundMusic: {
            enabled: true,
            src: "/assets/audio/background.mp3",
            volume: 0.3,
            loop: true
        },

        // ── Slot-event sounds ───────────────────────────────────────
        spin: {
            enabled: true,
            src: "/assets/audio/spin.mp3",
            volume: 1,
            loop: false
        },
        win: {
            enabled: true,
            src: "/assets/audio/win.mp3",
            volume: 1,
            loop: false
        },
        scatter: {
            enabled: true,
            src: "/assets/audio/scatter.mp3",
            volume: 1,
            loop: false
        },
        bonus: {
            enabled: true,
            src: "/assets/audio/bonus.mp3",
            volume: 1,
            loop: false
        },

        // ── Per-button click sounds ─────────────────────────────────
        //
        // Each key below is a button id. Every button calls
        // `ButtonSound.play(id)` and the resolver picks the right
        // src. An entry with `enabled: false` stays silent even
        // when `default` is set; missing keys fall through to
        // `default`. Missing files are swallowed silently.
        buttons: {
            default: {
                enabled: true,
                src: "/assets/audio/spin.mp3",
                volume: 1,
                loop: false,
            },
            spin: {
                enabled: true,
                src: "/assets/audio/spin.mp3",
                volume: 1,
                loop: false,
            },
            lobby: {
                enabled: true,
                src: "/assets/audio/spin.mp3",
                volume: 1,
                loop: false,
            },
            paytable: {
                enabled: true,
                src: "/assets/audio/spin.mp3",
                volume: 1,
                loop: false,
            },
            settings: {
                enabled: true,
                src: "/assets/audio/spin.mp3",
                volume: 1,
                loop: false,
            },
            sound: {
                enabled: true,
                src: "/assets/audio/spin.mp3",
                volume: 1,
                loop: false,
            },
            autoSpin: {
                enabled: true,
                src: "/assets/audio/spin.mp3",
                volume: 1,
                loop: false,
            },
            betPlus: {
                enabled: true,
                src: "/assets/audio/spin.mp3",
                volume: 1,
                loop: false,
            },
            betMinus: {
                enabled: true,
                src: "/assets/audio/spin.mp3",
                volume: 1,
                loop: false,
            },
        },
    },

    // Assets
    assets: {
        background: "/assets/backgrounds/game-bg.png",

        boardFrame: "/assets/ui/SRR-ReelFrame01.png",

        ui: {
            logo: "/assets/ui/SRR-Logo01.png",
            spinButton: "/assets/ui/SpinButton.png",
            autoSpin: "/assets/ui/AutoSpin.png",
            sound: "/assets/ui/Sound.png",
            mute: "/assets/ui/Mute.png",
            settings: "/assets/ui/Settings.png",
            betPanel: "/assets/ui/BetBox.png",
            balancePanel: "/assets/ui/BetBox.png",
            plusMinusButton: "/assets/ui/PlusMinusButton.png",
            paytableButton: "/assets/ui/Menu.png",
            lobbyButton: "/assets/ui/LobbyButton.png",
            gameMessage: "/assets/ui/GameMessage.png",
            stopButton: "/assets/ui/StopButton.png",
            clockIcon: "/assets/ui/Time.png",
            searchBar: "/assets/ui/SearchBar.png"
        },

        symbols: {
            RED_CANDY:
                "/assets/symbols/SRR_Symbol_Raspberry_01.png",

            BLUE_CANDY:
                "/assets/symbols/SRR_Symbol_Bluberry_01.png",

            BLACK_CANDY:
                "/assets/symbols/SRR_Symbol_BlueJelly_01.png",

            GREEN_CANDY:
                "/assets/symbols/SRR_Symbol_GreenCat_01.png",

            ORANGE_CANDY:
                "/assets/symbols/SRR_Symbol_Peach_01.png",

            PURPLE_CANDY:
                "/assets/symbols/SRR_Symbol_PurpleBoba_01.png",

            YELLOW_CANDY:
                "/assets/symbols/SRR_Symbol_RedBoba_01.png",

            SCATTER:
                "/assets/symbols/SRR_Symbol_Scatter_01.png"
        }
    },

    // UI Icon Layout
    // Single source of truth for HUD icon positions and sizes.
    // Components (BetPanel, SettingsButton, SoundButton, ...) MUST
    // read x/y/width/height from here instead of hard-coding.
    //
    // Centering strategy
    //
    //  Canvas is 1280 × 720. The visual centre is (640, 360).
    //  The play column (BoardFrame + grid) is centred on the
    //  canvas centre, and every HUD panel sits symmetrically
    //  to the left or right of it:
    //
    //    ┌────────────────────────────────────────────────────┐  y=0
    //    │                       TopBar                        │  y=44
    //    ├────────────┬──────────────────────────┬────────────┤
    //    │ GameLogo   │                          │ Spin       │
    //    │            │      BoardFrame + grid   │            │
    //    │ (left)     │      (centred, x=305)    │ (right)    │
    //    │            │                          │            │
    //    ├────────────┴──────────────────────────┴────────────┤
    //    │   Settings/Sound    AutoSpin/Paytable              │  y=535
    //    │   BET                BALANCE                       │  y=650
    //    └────────────────────────────────────────────────────┘  y=720
    //
    //  - BoardFrame / grid width = 670 → x = 305 so it spans
    //    305..975, centred on x=640.
    //  - HUD widths are 260px. Left HUD starts at x=20, right
    //    HUD ends at x=1260 (mirror), so both sit the same
    //    distance from the board's outer edges.
    //  - Bottom row y=650 leaves 70px (≈ 1 button row) below
    //    before the canvas bottom for visual breathing room.
    layout: {
        stage: {
            width: 1280,
            height: 720
        },

        // Board frame is rendered as a Pixi sprite (not a layout
        // cell), but it still belongs here so the surrounding HUD
        // can be tuned relative to the playfield.
        //
        // Width 670, height 600, x = (1280 - 670) / 2 = 305.
        // y = 35 places the top of the frame just under the
        // 44px TopBar with a small visual gap.
        boardFrame: {
            x: 305,
            y: 35,
            width: 670,
            height: 600,
            asset: "/assets/ui/SRR-ReelFrame01.png"
        },

        // Background image: stage-sized, anchored to top-left.
        background: {
            x: 0,
            y: 0,
            width: 1280,
            height: 720,
            asset: "/assets/backgrounds/game-bg.png"
        },

        // Reel / grid cell sizing used by SymbolSprite.
        // boardX mirrors boardFrame.x so the grid sits flush
        // inside the frame; boardY matches the inner top edge.
        grid: {
            boardX: 315,
            boardY: 85,
            boardWidth: 670,
            boardHeight: 600,
            symbolSize: 70,
            spriteSize: 60,
            rowGap: 8,
            colGap: 20,
            winningTint: 0xffeeaa,
            fallbackFontSize: 48
        },

        // Per-symbol fallback color used when a texture is missing.
        symbolFallbackColor: {
            RED_CANDY: 0xff4d4d,
            BLUE_CANDY: 0x4d79ff,
            GREEN_CANDY: 0x4dff7a,
            YELLOW_CANDY: 0xffd24d,
            PURPLE_CANDY: 0xb24dff,
            ORANGE_CANDY: 0xff944d,
            SCATTER: 0xffffff
        },

        // Shared colors used by HUD labels (Bet / Balance).
        hudText: {
            labelFill: "#00b7ff",
            valueFill: "#ffffff",
            fontWeight: "700"
        },

        // Left HUD cluster. Settings sits above Sound on the
        // same column, both flush-left with the BetPanel.
        settings: {
            x: 30,
            y: 530,
            width: 52,
            height: 52
        },
        sound: {
            x: 100,
            y: 530,
            width: 52,
            height: 52,
            // Two textures, swapped by SoundButton based on the
            // global audio state. `on` is the speaker-on icon;
            // `off` is the speaker-off / muted icon. Either may
            // be missing — SoundButton falls back gracefully.
            on: "/assets/ui/Sound.png",
            off: "/assets/ui/Mute.png",
        },
        // GameLogo sits above the left HUD cluster.
        gameLogo: {
            x: 30,
            y: 80,
            width: 260
        },
        // GameMessage is the small notification / status strip
        // drawn just below the BoardFrame / ReelFrame so it
        // reads as a "message bar" attached to the playfield.
        //
        // Layout math:
        //   boardFrame.y = 35, boardFrame.height = 600
        //   → bottom edge of ReelFrame = 35 + 600 = 635
        //   → strip top edge = 645 (10 px gap below the frame)
        //   → strip height  = 60
        //   → strip bottom  = 705, leaving a 15 px margin to
        //     the canvas bottom (720)
        //
        // Width 640 centred on the canvas
        // (x = (1280 − 640) / 2 = 320). The asset path lives
        // under `assets.ui.gameMessage` so a designer can point
        // to a different strip without touching code.
        gameMessage: {
            x: 320,
            y: 645,
            width: 640,
            height: 60
        },
        // SpinButton is on the right column, vertically
        // centred against the board (y ≈ 360). The stopButton
        // entry mirrors its geometry so the SpinButton can
        // swap to the dedicated stopButton.png texture while
        // a spin / auto-spin run is in flight — no tint hack.
        spinButton: {
            x: 1075,
            y: 360,
            width: 100,
            height: 100,
            icon: {
                fontSize: 72
            }
        },
        stopButton: {
            x: 1075,
            y: 360,
            width: 100,
            height: 100
        },
        // AutoSpin + Paytable sit below SpinButton on the
        // right column.
        autoSpin: {
            x: 1075,
            y: 480,
            width: 52,
            height: 52
        },
        paytableButton: {
            x: 1140,
            y: 480,
            width: 52,
            height: 52
        },
        topBar: {
            x: 0,
            y: 0,
            width: 1280,
            height: 44,
            backgroundColor: 0x050a28,
            backgroundAlpha: 0.85,
            gameTitleText: "GAME NAME",
            gameIdText: "GAME-02",
            clockText: "12:00",
            title: {
                x: 640,
                y: 22,
                color: 0xffffff,
                fontSize: 24,
                label: "GAME NAME",
                labelColor: 0xffffff
            },
            // Rounded-pill background behind the centered game
            // title text. Mirrors `gameIdBackground` and
            // `lobbyButton` so the three chips share the same
            // pill geometry and reuse the LobbyButton art.
            gameTitleBackground: {
                x: 540,
                y: 5,
                width: 200,
                height: 34
            },
            // Label rendered on top of the `gameIdBackground`
            // pill. Mirrors the `lobbyButton` config so the two
            // chips share the same label fields (label text,
            // label color, font size) and the JSX in TopBar.jsx
            // can treat them symmetrically. Anchored to the
            // center of the background pill.
            gameId: {
                x: 985,
                y: 22,
                color: 0xffffff,
                fontSize: 16,
                label: "GAME-02",
                labelColor: 0xffffff
            },
            // Rounded-rectangle background rendered behind the
            // centered `gameId` label on the right side of the
            // TopBar. Reuses the LobbyButton art so designers
            // can swap a single asset to re-skin both chips.
            // Anchored so the label lands in the middle of the
            // pill regardless of width. Mirrors `lobbyButton`
            // for a consistent pill geometry.
            gameIdBackground: {
                x: 940,
                y: 5,
                width: 90,
                height: 34
            },
            clock: {
                x: 65,
                y: 22,
                color: 0xffffff,
                fontSize: 20
            },
            // Clock icon shown immediately before the clock
            // text on the left side of the TopBar. Asset path
            // lives under `assets.ui.clockIcon` so a designer
            // can swap the artwork without touching code.
            clockIcon: {
                x: 16,
                y: 14,
                width: 18,
                height: 18,
                asset: "/assets/ui/Time.png"
            },
            lobbyButton: {
                x: 120,
                y: 5,
                width: 140,
                height: 34,
                radius: 18,
                borderColor: 0x3b7cff,
                fillTop: 0x163f93,
                fillBottom: 0x09255c,
                label: "LOBBY",
                labelColor: 0xffffff,
                fontSize: 16
            },
            // Search bar shown on the TopBar between the lobby
            // button (left) and the centered game title.
            // Sized to fit a 44px-tall bar with a small vertical
            //margin and rendered as a Pixi sprite using the
            //SearchBar.png art shipped under `assets.ui.searchBar`.
            searchBar: {
                x: 1080,
                y: 9,
                width: 187,
                height: 31,
                asset: "/assets/ui/SearchBar.png"
            }
        },
        // Bottom row: BetPanel left, BalancePanel right.
        // Both panels share the same width and vertical
        // position so they line up across the canvas.
        betPanel: {
            x: 30,
            y: 650,
            width: 250,
            height: 50,
            label: "BET",
            labelFontSize: 14,
            valuePrefix: "$",
            valueFontSize: 18,
            stepSize: 1,
            plusMinus: {
                asset: "/assets/ui/PlusMinusButton.png",
                width: 30,
                height: 40
            }
        },
        betPanelText: {
            minus: { x: 25, y: 25 },
            label: { x: 130, y: 18 },
            value: { x: 120, y: 35 },
            plus: { x: 220, y: 25 }
        },
        // Right edge = 1280 − 30 (mirror of left) − 250 = 1000.
        balancePanel: {
            x: 1000,
            y: 650,
            width: 250,
            height: 50,
            label: "BALANCE",
            labelFontSize: 14,
            valuePrefix: "$ ",
            valueFontSize: 18
        },
        balancePanelText: {
            label: { x: 130, y: 18 },
            value: { x: 120, y: 35 }
        }
    }
};

export default gameConfig;