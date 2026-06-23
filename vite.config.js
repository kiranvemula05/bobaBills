import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Force a single React instance across the main app, @pixi/react,
// and the react-reconciler it pulls in. Without this, Vite ends up
// bundling two copies of React and the hook dispatcher mismatches,
// which surfaces as "Invalid hook call" inside <Application> children.
//
// Static assets live in `public/assets/...`. Vite serves the contents
// of `public/` at the site root in both `npm run dev` and the
// production build, so the existing URLs (`/assets/...`) work in
// both modes — no extra `fs.allow` entries needed.
export default defineConfig({
    plugins: [react()],
    resolve: {
        dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
    optimizeDeps: {
        include: [
            "react",
            "react-dom",
            "react-dom/client",
            "react/jsx-runtime",
            "react/jsx-dev-runtime",
            "@pixi/react",
            "pixi.js",
        ],
    },
});
