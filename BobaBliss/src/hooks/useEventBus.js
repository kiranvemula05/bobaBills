import { useEffect, useRef, useState } from "react";
import { Assets } from "pixi.js";
import EventBus from "../engine/EventBus.js";

/**
 * useEventBus
 *
 * Subscribe a component to a single EventBus event. The handler is
 * invoked with the emitted payload, and the component re-renders
 * on every emit so any state changes inside the handler take effect.
 *
 * The handler is stored in a ref so the subscription effect can be
 * declared with `[]` deps — re-binding the listener every time the
 * parent passes a new callback would multiply the work during the
 * cascade loop. The re-render is driven by a small `setTick`
 * counter bumped on every emit; this is intentionally cheap and
 * only fires for components that actually subscribe to the event.
 */
export function useEventBus(event, handler) {
    const handlerRef = useRef(handler);
    const [, setTick] = useState(0);
    handlerRef.current = handler;

    useEffect(() => {
        const cb = (payload) => {
            handlerRef.current?.(payload);
            setTick((n) => (n + 1) & 0x7fffffff);
        };
        EventBus.on(event, cb);
        return () => EventBus.off(event, cb);
    }, [event]);
}

/**
 * useEventBusEffect
 *
 * Side-effect-only subscription. No re-renders on emit. Useful for
 * listeners that just push values into Zustand.
 */
export function useEventBusEffect(event, handler, deps = []) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        EventBus.on(event, handler);
        return () => EventBus.off(event, handler);
    }, deps);
}