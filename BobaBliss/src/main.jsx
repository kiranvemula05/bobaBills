import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./app.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <Suspense fallback={<LoadingScreen />}>
            <App />
        </Suspense>
    </StrictMode>
);
