import { isValidElement } from "react";
import { Navigate } from "react-router-dom";
import { router } from "@/routes";
import { TITULOS_DE_RUTA, TITULO_POR_DEFECTO, tituloDeRuta } from "@/shared/lib/titulos";
import type { RouteObject } from "react-router-dom";

// T2-18: una ruta nueva sin título anunciaría «Página no encontrada» al llegar a ella,
// que es peor que no anunciar nada. Este test compara la lista con el router de verdad,
// igual que el de T2-29 compara el esquema de Swagger con el validador: el registro no
// depende de que alguien se acuerde de actualizarlo.

/** Todas las rutas concretas del router, con su ruta completa. */
function rutasDe(rutas: readonly RouteObject[], prefijo = ""): string[] {
    return rutas.flatMap((ruta) => {
        // El comodín del 404 no es una sección: su título es el valor por defecto.
        if (ruta.path === "*") return [];

        const propia = ruta.path
            ? `${prefijo}/${ruta.path}`.replace(/\/{2,}/g, "/")
            : prefijo || "/";

        const hijas = ruta.children ? rutasDe(ruta.children, propia === "/" ? "" : propia) : [];

        // Una redirección (`<Navigate>`) no es un destino: nadie se queda en ella el
        // tiempo suficiente para que se anuncie, así que no necesita título.
        const esRedireccion = isValidElement(ruta.element) && ruta.element.type === Navigate;

        // Una ruta que solo agrupa (sin elemento propio) tampoco se visita nunca.
        return ruta.element && !esRedireccion ? [propia, ...hijas] : hijas;
    });
}

describe("Títulos de ruta (T2-18)", () => {
    const delRouter = [...new Set(rutasDe(router.routes))];

    it("el router tiene las rutas que se esperan", () => {
        // Red de la propia red: si esta cifra cae a cero, el recorrido dejó de funcionar
        // y las comprobaciones de abajo pasarían sin mirar nada.
        expect(delRouter.length).toBeGreaterThan(15);
        expect(delRouter).toContain("/catalog/products");
    });

    it("toda ruta del router tiene título", () => {
        const patrones = new Set(TITULOS_DE_RUTA.map((t) => t.patron));
        const sinTitulo = delRouter.filter((ruta) => !patrones.has(ruta));

        expect(
            sinTitulo,
            `Rutas del router sin entrada en TITULOS_DE_RUTA:\n${sinTitulo.join("\n")}`,
        ).toEqual([]);
    });

    it("no sobra ningún título de una ruta que ya no existe", () => {
        const delRouterSet = new Set(delRouter);
        const huerfanos = TITULOS_DE_RUTA.map((t) => t.patron).filter((p) => !delRouterSet.has(p));

        expect(huerfanos, `Títulos sin ruta:\n${huerfanos.join("\n")}`).toEqual([]);
    });

    // Desde T4-04 lo que devuelve es la **clave** del catálogo; el texto lo pone
    // `AnuncioDeRuta` al pintar. Que la clave lleve a un texto de verdad lo comprueba
    // `i18n.test.ts`, que exige que las dos listas del catálogo coincidan.
    it("resuelve una ruta con parámetro", () => {
        expect(tituloDeRuta("/catalog/products/9f5e/movements")).toBe("ruta.movimientos");
    });

    it("la comparación es exacta: `/catalog` no se come a sus hijas", () => {
        expect(tituloDeRuta("/catalog")).toBe("ruta.catalogo");
        expect(tituloDeRuta("/catalog/tags")).toBe("ruta.etiquetas");
    });

    it("una ruta desconocida cae en el título por defecto", () => {
        expect(tituloDeRuta("/no-existe")).toBe(TITULO_POR_DEFECTO);
    });
});
