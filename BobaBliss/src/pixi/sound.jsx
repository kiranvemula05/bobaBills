import { useEffect, useState } from "react";
import { Assets } from "pixi.js";
import gameConfig from "../games/suger-rush/config.js";
import ButtonSound from "../components/ButtonSound.js";
import audioBus from "../components/audioBus.js";

function SoundButton() {
    // Texture set is keyed off the global audio state: the
    // speaker-on icon when audio is live, the muted icon when
    // the user has toggled sound off via this button (or any
    // future settings panel that flips the bus).
    const [paused, setPaused] = useState(() => audioBus.isPaused());
    const [textureOn, setTextureOn] = useState(null);
    const [textureOff, setTextureOff] = useState(null);

    const { x, y, width, height } = gameConfig.layout.sound;
    const urlOn = gameConfig.layout.sound.on ?? gameConfig.assets.ui.sound;
    const urlOff = gameConfig.layout.sound.off ?? urlOn;

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            Assets.load(urlOn),
            urlOff === urlOn
                ? Promise.resolve(null)
                : Assets.load(urlOff).catch(() => null),
        ]).then(([on, off]) => {
            if (cancelled) return;
            setTextureOn(on);
            setTextureOff(off);
        });
        return () => {
            cancelled = true;
        };
    }, [urlOn, urlOff]);

    // Keep local UI state in sync if another component toggles
    // the bus.
    useEffect(() => audioBus.subscribe(({ paused: p }) => setPaused(p)), []);

    const texture = paused ? (textureOff ?? textureOn) : textureOn;
    if (!texture) return null;

    const toggle = () => {
        const next = !paused;
        setPaused(next);
        // Push the change through the global bus. BGM, click
        // sounds, and any future audio source all listen to it
        // and react together.
        if (next) audioBus.pause();
        else audioBus.resume();
    };

    return (
        <pixiSprite
            texture={texture}
            x={x}
            y={y}
            width={width}
            height={height}
            eventMode="static"
            cursor="pointer"
            onClick={() => {
                ButtonSound.play("sound");
                toggle();
                console.log("Sound Clicked");
            }}
        />
    );
}

export default SoundButton;