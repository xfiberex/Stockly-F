import { CODIGOS_DE_ERROR } from "@/shared/contratos";
import { es } from "@/shared/i18n/es";
import { en } from "@/shared/i18n/en";
import { traducir, traducirCantidad, clavesDelCatalogo, type Clave } from "@/shared/i18n/traducir";
import {
    aplicarIdioma,
    CLAVE_DE_IDIOMA,
    elegirIdioma,
    idiomaDelNavegador,
    idiomaEfectivo,
    leerPreferenciaDeIdioma,
    PREFERENCIAS_DE_IDIOMA,
} from "@/shared/i18n/idioma";

/**
 * T4-04 — las guardias del catálogo.
 *
 * El tipo de `en.ts` ya impide que falte o sobre una clave, y esa es la primera línea. Pero un
 * tipo no ve tres cosas que sí rompen la interfaz: que una traducción se quede vacía, que
 * pierda por el camino uno de los huecos de interpolación —«Disponible: , requerido: »— o que
 * el backend estrene un código de error que aquí no existe.
 */

const huecos = (plantilla: string) => [...plantilla.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("Catálogo de traducción (T4-04)", () => {
    it("los dos idiomas declaran exactamente las mismas claves", () => {
        // Redundante con el tipo **a propósito**: un `as` mal puesto en `en.ts` desactivaría la
        // comprobación del compilador sin que nadie se enterase.
        expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
        expect(clavesDelCatalogo().length).toBeGreaterThan(50);
    });

    it("ninguna traducción se queda vacía", () => {
        const vacias = clavesDelCatalogo().filter((c) => !es[c].trim() || !en[c].trim());
        expect(vacias).toEqual([]);
    });

    it("las dos versiones de una frase interpolan los mismos huecos", () => {
        // El fallo típico al traducir: quedarse un `{cantidad}` por el camino. La frase sale
        // entera y con sentido, y le falta el dato.
        const desajustadas = clavesDelCatalogo()
            .filter((c) => huecos(es[c]).join() !== huecos(en[c]).join())
            .map((c) => `${c}: es=[${huecos(es[c])}] en=[${huecos(en[c])}]`);

        expect(desajustadas).toEqual([]);
    });

    it("cada código de error del contrato tiene traducción", () => {
        // La lista sale del **contrato**, no de una copia: un código nuevo en el backend rompe
        // esta suite en cuanto se regenera el contrato, que es antes de que nadie lo vea en
        // pantalla como un texto en crudo.
        const sinTraducir = CODIGOS_DE_ERROR.filter((codigo) => !(`error.${codigo}` in es));
        expect(sinTraducir).toEqual([]);
    });

    it("no sobra ninguna traducción de un código que la API ya no manda", () => {
        const delContrato = new Set<string>(CODIGOS_DE_ERROR);
        const huerfanas = clavesDelCatalogo()
            .filter((c) => c.startsWith("error.") && /^error\.[A-Z_]+$/.test(c))
            .filter((c) => !delContrato.has(c.slice("error.".length)));

        expect(huerfanas).toEqual([]);
    });

    it("ninguna clave del catálogo se ha quedado sin usar", () => {
        // El compilador vigila que las dos copias digan lo mismo, pero **no que alguien las
        // lea**: una clave cuya pantalla se rediseñó se queda ahí para siempre, y con ella su
        // traducción, que alguien mantendrá sin saber que no se ve. Se encontraron ocho al
        // limpiar el proyecto —`comun.buscar`, `comun.cargando`, `ordenes.eliminar`…—, todas
        // de pantallas que cambiaron de forma.
        //
        // **Las familias dinámicas quedan fuera y hay que nombrarlas una a una**, porque su
        // clave se compone en tiempo de ejecución (`error.${code}`, `auditoria.accion.${a}`)
        // y una búsqueda por texto nunca las encontraría. Esa exención es justo lo que hace
        // falsa a esta guardia si se amplía a la ligera: un prefijo de más aquí apaga la
        // comprobación para todo un módulo.
        const DINAMICAS = [/^error\./, /^auditoria\.(accion|entidad)\./, /^ajuste\./];

        const fuentes = import.meta.glob("/src/**/*.{ts,tsx}", { eager: true, query: "?raw", import: "default" });
        const codigo = Object.entries(fuentes)
            .filter(([ruta]) => !ruta.includes("/shared/i18n/"))
            .map(([, texto]) => texto as string)
            .join("\n");

        const sinUsar = clavesDelCatalogo()
            .filter((c) => !DINAMICAS.some((re) => re.test(c)))
            // Los plurales se piden por su raíz: `tn("movimientos.unidades", n)`.
            .filter((c) => !codigo.includes(c.replace(/_(one|other)$/, "")));

        expect(sinUsar, `Sobran en el catálogo:\n${sinUsar.join("\n")}`).toEqual([]);
    });
});

describe("traducir", () => {
    it("devuelve el texto de cada idioma", () => {
        expect(traducir("es", "comun.guardar")).toBe("Guardar");
        expect(traducir("en", "comun.guardar")).toBe("Save");
    });

    it("interpola por nombre y deja intacto el hueco sin valor", () => {
        expect(traducir("es", "error.ROUTE_NOT_FOUND", { metodo: "GET", ruta: "/x" })).toBe(
            "Ruta no encontrada: GET /x",
        );
        expect(traducir("es", "error.ROUTE_NOT_FOUND", { metodo: "GET" })).toContain("{ruta}");
    });

    it("una clave que no existe se devuelve tal cual, que es como se ve un estado desconocido", () => {
        expect(traducir("es", "PARTIALLY_RECEIVED" as Clave)).toBe("PARTIALLY_RECEIVED");
    });
});

describe("traducirCantidad", () => {
    it("elige forma por cantidad en los dos idiomas", () => {
        expect(traducirCantidad("es", "importacion.filasConError", 1)).toBe("1 fila con errores omitida");
        expect(traducirCantidad("es", "importacion.filasConError", 3)).toBe("3 filas con errores omitidas");
        expect(traducirCantidad("en", "importacion.filasConError", 1)).toBe("1 row with errors skipped");
        expect(traducirCantidad("en", "importacion.filasConError", 3)).toBe("3 rows with errors skipped");
    });

    it("el cero va en la forma general, que es lo que piden español e inglés", () => {
        expect(traducirCantidad("es", "importacion.filasConError", 0)).toContain("filas");
        expect(traducirCantidad("en", "importacion.filasConError", 0)).toContain("rows");
    });
});

describe("Preferencia de idioma", () => {
    afterEach(() => {
        window.localStorage.clear();
        document.documentElement.lang = "es";
    });

    it("sin nada guardado es `auto`, y `auto` sale del navegador", () => {
        expect(leerPreferenciaDeIdioma()).toBe("auto");
        // `setup.ts` fija el entorno de test en español; ver allí por qué.
        expect(idiomaDelNavegador()).toBe("es");
        expect(idiomaEfectivo()).toBe("es");
    });

    it("respeta el orden de preferencia del navegador, no solo el primero", () => {
        Object.defineProperty(navigator, "languages", { value: ["fr-FR", "en-GB", "es"], configurable: true });
        expect(idiomaDelNavegador()).toBe("en");

        Object.defineProperty(navigator, "languages", { value: ["es-ES", "es"], configurable: true });
        expect(idiomaDelNavegador()).toBe("es");
    });

    it("un idioma que no existe cae al de referencia", () => {
        Object.defineProperty(navigator, "languages", { value: ["fr-FR", "de"], configurable: true });
        expect(idiomaDelNavegador()).toBe("es");
        Object.defineProperty(navigator, "languages", { value: ["es-ES", "es"], configurable: true });
    });

    it.each(PREFERENCIAS_DE_IDIOMA)("guarda y relee «%s»", (preferencia) => {
        elegirIdioma(preferencia);
        expect(window.localStorage.getItem(CLAVE_DE_IDIOMA)).toBe(preferencia);
        expect(leerPreferenciaDeIdioma()).toBe(preferencia);
    });

    it("`lang` lleva el idioma **efectivo**, nunca «auto»", () => {
        // Un lector de pantalla elige la voz por este atributo: con `lang="auto"` —o con el
        // idioma equivocado— lee inglés con fonética española y no se entiende.
        aplicarIdioma("en");
        expect(document.documentElement.lang).toBe("en");

        aplicarIdioma("auto");
        expect(document.documentElement.lang).toBe("es");
    });

    it("descarta un valor guardado que no sea una preferencia", () => {
        window.localStorage.setItem(CLAVE_DE_IDIOMA, "klingon");
        expect(leerPreferenciaDeIdioma()).toBe("auto");
    });
});
