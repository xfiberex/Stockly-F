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
            // T2-22: un suelo, no una meta. Nada impedía que la cobertura bajara, y sin
            // CI que lo vigile la única barrera es que `pnpm verify` falle aquí mismo.
            //
            // Cada umbral son **dos puntos por debajo del valor real** del 2026-08-09
            // (44.55 / 52.19 / 35.70 / 45.59), que es margen para un refactor honrado
            // sin dejar sitio a que se erosione sin que nadie se entere. Al subir la
            // cobertura, subir también estos números: es lo que convierte el avance en
            // irreversible.
            thresholds: {
                statements: 42,
                branches: 50,
                functions: 33,
                lines: 43,
            },
        },
    },
}));
