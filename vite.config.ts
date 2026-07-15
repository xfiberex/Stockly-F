import { defineConfig, configDefaults } from "vitest/config";
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
        // Los tests E2E de Playwright viven en /e2e y no deben ejecutarse con vitest.
        exclude: [...configDefaults.exclude, "e2e/**"],
        env: {
            VITE_API_URL: "http://localhost:3000/api/v1",
        },
        coverage: {
            // all:true incluye TODA la app en el reporte, no solo los archivos que
            // los tests importan — así el porcentaje refleja la cobertura real.
            all: true,
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "src/**/*.test.{ts,tsx}",
                "src/tests/**",
                "src/**/types/**",
                "src/main.tsx",
                "src/vite-env.d.ts",
                "src/config/**",
            ],
        },
    },
}));
