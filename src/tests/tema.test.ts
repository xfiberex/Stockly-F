import { readFileSync } from "node:fs";
import path from "node:path";
import {
    aplicarTema,
    ATRIBUTO_DE_TEMA,
    CLAVE_DE_TEMA,
    elegirTema,
    esTema,
    leerTema,
    suscribirseAlTema,
    TEMAS,
} from "@/shared/lib/tema";

/**
 * T4-11 — la preferencia de tema.
 *
 * Dos cosas distintas se comprueban aquí. La primera es el módulo: qué se guarda, qué se
 * lee y qué atributo acaba en `<html>`. La segunda es más importante y no se ve leyendo un
 * solo archivo — **la misma decisión está escrita en tres sitios**: el módulo, el script en
 * línea de `index.html` (que tiene que aplicar el tema antes del primer pintado y por eso no
 * puede importar nada) y los selectores de `index.css`. Si se separan, no falla nada: el
 * tema simplemente deja de recordarse, o parpadea en cada carga, y eso no lo nota un test
 * que solo mire una de las tres piezas.
 */

const raiz = () => document.documentElement;

function limpiar() {
    delete raiz().dataset[ATRIBUTO_DE_TEMA];
    window.localStorage.clear();
}

describe("Preferencia de tema (T4-11)", () => {
    beforeEach(limpiar);
    afterEach(limpiar);

    it("sin nada guardado, el tema es `auto`", () => {
        expect(leerTema()).toBe("auto");
    });

    it("descarta un valor guardado que no sea un tema", () => {
        // Una clave del mismo origen la puede escribir cualquiera —incluida una versión
        // anterior de la aplicación—, así que se valida en vez de confiar.
        window.localStorage.setItem(CLAVE_DE_TEMA, "azul");
        expect(leerTema()).toBe("auto");
    });

    it.each(TEMAS)("guarda y relee «%s»", (tema) => {
        elegirTema(tema);
        expect(window.localStorage.getItem(CLAVE_DE_TEMA)).toBe(tema);
        expect(leerTema()).toBe(tema);
    });

    it("`auto` quita el atributo, que es lo que devuelve el control al sistema", () => {
        // Dejarlo puesto con el valor «auto» no sería inofensivo: `:root[data-tema]` no
        // casaría con ninguna regla y el tema se quedaría en el `light dark` de `:root`
        // por casualidad, no por diseño.
        aplicarTema("oscuro");
        expect(raiz().dataset[ATRIBUTO_DE_TEMA]).toBe("oscuro");

        aplicarTema("auto");
        expect(raiz().dataset[ATRIBUTO_DE_TEMA]).toBeUndefined();
        expect(raiz().hasAttribute("data-tema")).toBe(false);
    });

    it("avisa a quien esté suscrito en la misma pestaña", () => {
        // `storage` solo llega a las **otras** pestañas: sin el registro propio, el selector
        // se quedaría marcando la opción anterior aunque la página ya hubiera cambiado.
        const aviso = vi.fn();
        const desuscribir = suscribirseAlTema(aviso);

        elegirTema("oscuro");
        expect(aviso).toHaveBeenCalledTimes(1);

        desuscribir();
        elegirTema("claro");
        expect(aviso).toHaveBeenCalledTimes(1);
    });

    it("adopta el tema que otra pestaña haya elegido", () => {
        const aviso = vi.fn();
        const desuscribir = suscribirseAlTema(aviso);

        // Lo que hace el navegador: escribe el valor y dispara el evento en las demás.
        window.localStorage.setItem(CLAVE_DE_TEMA, "oscuro");
        window.dispatchEvent(new StorageEvent("storage", { key: CLAVE_DE_TEMA }));

        expect(raiz().dataset[ATRIBUTO_DE_TEMA]).toBe("oscuro");
        expect(aviso).toHaveBeenCalled();

        desuscribir();
    });

    it("sigue funcionando con el almacenamiento bloqueado", () => {
        // Safari en navegación privada, o cookies de terceros desactivadas dentro de un
        // iframe: `localStorage` **lanza**, no devuelve null. Sin el `try`, la aplicación no
        // arranca. Lo que se exige es que el tema valga igualmente en esta sesión.
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new DOMException("QuotaExceededError");
        });
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new DOMException("SecurityError");
        });

        expect(leerTema()).toBe("auto");
        expect(() => elegirTema("oscuro")).not.toThrow();
        expect(raiz().dataset[ATRIBUTO_DE_TEMA]).toBe("oscuro");

        vi.restoreAllMocks();
    });

    it("`esTema` acepta los tres y rechaza lo demás", () => {
        for (const tema of TEMAS) expect(esTema(tema)).toBe(true);
        for (const otro of ["", "dark", "AUTO", null, undefined, 1]) expect(esTema(otro)).toBe(false);
    });
});

describe("Los tres sitios donde vive la misma decisión (T4-11)", () => {
    const html = readFileSync(path.join(process.cwd(), "index.html"), "utf8");
    const css = readFileSync(path.join(process.cwd(), "src/index.css"), "utf8");

    it("el script en línea usa la misma clave que el módulo", () => {
        expect(html).toContain(`localStorage.getItem("${CLAVE_DE_TEMA}")`);
    });

    it("el script en línea escribe el mismo atributo", () => {
        expect(html).toMatch(new RegExp(`documentElement\\.dataset\\.${ATRIBUTO_DE_TEMA}\\s*=`));
    });

    it("el script en línea reconoce exactamente los temas con atributo", () => {
        // `auto` no aparece a propósito: es la ausencia de atributo. Los otros dos sí, y si
        // alguien añadiera un tema al módulo sin tocar el HTML, ese tema no se aplicaría
        // hasta que arrancase React — o sea, parpadeando.
        for (const tema of TEMAS.filter((t) => t !== "auto")) {
            expect(html, `«${tema}» en el script en línea`).toContain(`=== "${tema}"`);
        }
    });

    it("va antes del primer pintado, no en un módulo diferido", () => {
        // Un `<script type="module">` es diferido por definición: para cuando se ejecuta, el
        // navegador ya ha pintado con el tema del sistema. Ahí está el parpadeo.
        const bloque = /<script>([\s\S]*?)<\/script>/.exec(html);
        expect(bloque, "no hay ningún script en línea en index.html").not.toBeNull();
        expect(bloque![1]).toContain(CLAVE_DE_TEMA);
        expect(html.indexOf(bloque![0])).toBeLessThan(html.indexOf("</head>"));
    });

    it("el CSS tiene una regla por cada tema con atributo", () => {
        for (const tema of TEMAS.filter((t) => t !== "auto")) {
            expect(css, `regla de «${tema}»`).toContain(`:root[data-${ATRIBUTO_DE_TEMA}="${tema}"]`);
        }
    });
});
