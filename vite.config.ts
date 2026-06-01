import { defineConfig } from "vitest/config";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        tailwindcss(),
        // El plugin de babel del React Compiler usa Rolldown internamente; se excluye en tests
        ...(mode !== "test" ? [babel({ presets: [reactCompilerPreset()] })] : []),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    if (id.includes("recharts")) return "vendor-charts";
                    if (id.includes("react-router")) return "vendor-router";
                    if (id.includes("@tanstack")) return "vendor-query";
                    if (id.includes("node_modules")) return "vendor";
                },
            },
        },
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/tests/setup.ts"],
        env: {
            VITE_API_URL: "http://localhost:3000/api/v1",
        },
    },
}));
