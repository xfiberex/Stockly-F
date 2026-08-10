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
                // T2-06 — un `vendor` de 559 kB se cargaba entero para pintar el
                // formulario de login. Se parte por **cuándo hace falta cada cosa**, no
                // por repartir bultos: lo que solo usan algunas rutas viaja en su propio
                // trozo y el navegador no lo pide hasta que se llega a ellas.
                //
                // El orden importa: se comprueba de lo más específico a lo más general,
                // porque `react-dom` también contiene «react» y `d3-shape` vive dentro
                // del árbol de dependencias de recharts.
                manualChunks(id: string) {
                    if (!id.includes("node_modules")) return;

                    // Recharts y **todo lo que solo existe por él**. Las rutas que pintan
                    // gráficas son diferidas, así que separarlo lo mantiene fuera del
                    // arranque; dejarlo revuelto con el resto lo metía en `vendor`, que sí
                    // se descarga siempre. `@reduxjs/toolkit`, `immer`, `es-toolkit` y
                    // compañía no los usa esta aplicación: son dependencias de recharts.
                    if (id.includes("recharts")) return "vendor-charts";
                    if (/[\\/]node_modules[\\/](@reduxjs|react-redux|immer|reselect|es-toolkit|decimal\.js-light|victory-vendor|d3-)/.test(id)) {
                        return "vendor-charts-deps";
                    }

                    if (id.includes("react-router")) return "vendor-router";
                    if (id.includes("@tanstack")) return "vendor-query";

                    // Formularios: solo los usan las páginas con formulario, y ninguna de
                    // ellas es la primera que se ve.
                    if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("/zod/")) {
                        return "vendor-forms";
                    }

                    // React se queda **dentro** de `vendor`, aunque separarlo parezca lo
                    // natural y la ficha de T2-06 lo pidiera: medido, sacar `react` (o solo
                    // `react-dom`) a su propio trozo arrastra `vendor-charts` al arranque
                    // —697 → 956 kB— porque el grafo de trozos pasa a tener un ciclo entre
                    // React y quien lo importa. Se descartó con la medición delante.
                    return "vendor";
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
