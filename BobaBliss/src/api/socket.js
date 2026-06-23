// Lazy / optional socket.io client. The casino backend at
// localhost:3000 may not be running in dev — we don't want a
// connection error to crash the page, and we don't want the
// socket to register handlers on import (the original code did
// `socket.on("SPIN_RESULT", ...)` at module load, which fires
// whenever the engine emits that event).

let _socket = null;
let _io = null;

async function getSocket() {
    if (_socket) return _socket;
    try {
        if (!_io) {
            const mod = await import("socket.io-client");
            _io = mod.io;
        }
        _socket = _io("http://localhost:3000", {
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 5000,
            timeout: 5000,
            transports: ["websocket", "polling"],
        });

        _socket.on("connect_error", (err) => {
            // eslint-disable-next-line no-console
            console.warn(
                "[socket] backend offline, running in local-only mode:",
                err.message
            );
        });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
            "[socket] socket.io-client not available:",
            err.message
        );
        _socket = null;
    }
    return _socket;
}

const proxyHandler = {
    get(_target, prop) {
        // Synchronous return — we use no-op fallbacks if the
        // socket isn't connected yet. The first interaction will
        // attempt to connect; subsequent calls reuse the result.
        const s = _socket;
        if (!s) {
            // Trigger the async connect in the background.
            getSocket();
            if (prop === "on" || prop === "off" || prop === "emit") {
                return () => {};
            }
            return undefined;
        }
        const value = s[prop];
        return typeof value === "function" ? value.bind(s) : value;
    },
};

const socket = new Proxy({}, proxyHandler);

export default socket;
