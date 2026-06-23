import { usePreloaderProgress } from "../hooks/usePreloaderProgress.js";

const PHASE_LABELS = {
    idle: "Preparing",
    manifest: "Reading manifest",
    bundles: "Loading bundles",
    assets: "Loading assets",
    done: "Ready",
};

/**
 * LoadingScreen
 *
 * The Suspense fallback for the main app. Reads live progress
 * from the preloader so the bar moves as assets stream in.
 *
 * Used as:
 *   <Suspense fallback={<LoadingScreen />}>
 *       <HUD />
 *   </Suspense>
 */
function LoadingScreen() {
    const { progress, phase } = usePreloaderProgress();
    const label = PHASE_LABELS[phase] ?? "Loading";

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "radial-gradient(circle at center, #15182a 0%, #0b0d12 70%)",
                color: "#f5f5f5",
                gap: 16,
                fontFamily:
                    "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            }}
        >
            <h2
                style={{
                    margin: 0,
                    fontWeight: 600,
                    fontSize: 22,
                    letterSpacing: 0.5,
                }}
            >
                Sugar Rush
            </h2>
            <div
                style={{
                    opacity: 0.7,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    width: 280,
                    height: 8,
                    borderRadius: 4,
                    background: "#1f2230",
                    overflow: "hidden",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
                }}
            >
                <div
                    style={{
                        width: `${progress}%`,
                        height: "100%",
                        background:
                            "linear-gradient(90deg, #ff7ab6, #ffb86b)",
                        transition: "width 120ms linear",
                    }}
                />
            </div>
            <div
                style={{
                    opacity: 0.7,
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 13,
                }}
            >
                {progress}%
            </div>
        </div>
    );
}

export default LoadingScreen;
