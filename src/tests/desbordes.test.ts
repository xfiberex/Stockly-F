import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// T2-45: en Chrome de Android, un contenedor con scroll horizontal ensancha el
// *viewport de diseño* con el ancho de su contenido aunque lo recorte visualmente.
// Todo lo que sea `position: fixed` —los modales— se dimensiona contra ese viewport
// ensanchado y acaba midiendo más que la pantalla, con la mitad derecha (donde vive
// el botón primario) fuera del borde. `contain: paint` lo impide.
//
// Medido con Playwright en Pixel 5 (393 px): con la tabla de productos en pantalla,
// un `position: fixed; inset: 0` medía **663 px**; con `contain: paint` en el
// scroller, **393**. No basta con `overflow-x: hidden` en el elemento raíz, que se
// probó y no cambia nada.

const RAIZ = join(__dirname, "..");

function archivosTsx(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) return entrada === "tests" ? [] : archivosTsx(ruta);
        return ruta.endsWith(".tsx") ? [ruta] : [];
    });
}

/** Los `className` de un archivo, uno por atributo. */
function clases(contenido: string): string[] {
    return [...contenido.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
}

describe("Desbordamiento horizontal en móvil (T2-45)", () => {
    const archivos = archivosTsx(RAIZ);

    it("encuentra los componentes con scroll horizontal", () => {
        // Ya no se cuentan cadenas sueltas: desde que los desplazadores salen de
        // `clasesDeTabla.ts`, lo que se busca es quién usa la constante. La comprobación
        // sigue teniendo el mismo sentido —saber cuántos hay para que uno nuevo no entre
        // sin pasar por aquí—, pero ahora `contain-paint` se garantiza en un solo sitio.
        const conScroll = archivos.filter((f) => {
            const contenido = readFileSync(f, "utf8");
            return (
                contenido.includes("CLASES_TABLA_DESPLAZABLE") ||
                clases(contenido).some((c) => c.includes("overflow-x-auto"))
            );
        });

        expect(conScroll.length).toBeGreaterThanOrEqual(9);
    });

    it("la clase compartida trae la contención de pintado", () => {
        // Es la que usan todas las tablas: si se le cae `contain-paint`, vuelven los
        // modales más anchos que la pantalla en Chrome de Android, y de golpe en toda la
        // aplicación.
        const compartidas = readFileSync(join(RAIZ, "shared/lib/clasesDeTabla.ts"), "utf8");

        expect(compartidas).toContain("overflow-x-auto contain-paint sin-barra");
    });

    it("todo scroller horizontal lleva `contain-paint`", () => {
        const sinContencion: string[] = [];

        for (const archivo of archivos) {
            for (const clase of clases(readFileSync(archivo, "utf8"))) {
                if (clase.includes("overflow-x-auto") && !clase.includes("contain-paint")) {
                    sinContencion.push(`${archivo.replace(RAIZ, "src")} → "${clase}"`);
                }
            }
        }

        expect(
            sinContencion,
            `Estos contenedores con scroll horizontal ensancharían el viewport de diseño en móvil:\n${sinContencion.join("\n")}`,
        ).toEqual([]);
    });
});

// Repaso de móvil a 412 px (Galaxy S20 Ultra), medido en navegador. Las tres cosas que se
// arreglaron fallaban en silencio: nada peta, simplemente no se lee.
describe("Encabezado de pantalla en móvil", () => {
    const archivos = archivosTsx(RAIZ);

    it("ninguna pantalla escribe a mano el encabezado", () => {
        // La cadena que estaba repetida en las siete pantallas con acciones. Cada copia
        // traía el mismo defecto: a 412 px los botones se reparten la fila según lo larga
        // que sea su palabra, no según el diseño. Ahora la decisión vive en
        // `clasesDeEncabezado.ts` y se cambia una vez.
        const aMano = archivos.filter((f) =>
            readFileSync(f, "utf8").includes('"flex items-center justify-between gap-3 flex-wrap"'),
        );

        expect(
            aMano.map((f) => f.replace(RAIZ, "src")),
            "Usa CLASES_ENCABEZADO_DE_PAGINA de shared/lib/clasesDeEncabezado",
        ).toEqual([]);
    });

    it("ninguna pantalla fija el relleno lateral de escritorio", () => {
        // `px-6` sin variante se come 48 de los 412 px de un teléfono, y esos 48 son los
        // que le faltaban al importe del inventario para caber en su tarjeta.
        //
        // Se mira **cualquier** ancho máximo y no solo `max-w-7xl`: la primera versión
        // buscaba ese literal y dejó fuera las cuatro pantallas que centran a otra medida
        // —perfil, configuración y las dos vistas de movimientos, que son `max-w-2xl`,
        // `3xl` y `4xl`—. Un envoltorio centrado es un envoltorio de página, mida lo que
        // mida.
        const fijos: string[] = [];

        for (const archivo of archivos) {
            for (const clase of clases(readFileSync(archivo, "utf8"))) {
                const esEnvoltorio = /(^|\s)max-w-\S+\s+mx-auto\b/.test(clase) || /(^|\s)mx-auto\s+max-w-/.test(clase);
                const rellenoFijo = /(^|\s)px-6\b/.test(clase) && !/(^|\s)sm:px-6\b/.test(clase);

                if (esEnvoltorio && rellenoFijo) {
                    fijos.push(`${archivo.replace(RAIZ, "src")} → "${clase}"`);
                }
            }
        }

        expect(fijos, `Usa px-4 … sm:px-6 (o CLASES_CONTENEDOR_DE_PAGINA):\n${fijos.join("\n")}`).toEqual([]);
    });
});

describe("Tablas desplazables", () => {
    const archivos = archivosTsx(RAIZ);
    const conTabla = archivos.filter((f) => readFileSync(f, "utf8").includes("<table"));

    it("encuentra las tablas del proyecto", () => {
        // Si baja, es que se borró una pantalla; si sube, hay una tabla nueva que tiene que
        // pasar por las comprobaciones de abajo.
        const total = conTabla.reduce(
            (suma, f) => suma + (readFileSync(f, "utf8").match(/<table/g) ?? []).length,
            0,
        );

        expect(total).toBeGreaterThanOrEqual(12);
    });

    it("ninguna tabla escribe sus clases a mano", () => {
        // `w-full text-sm` sin ancho mínimo **no se desplaza**: la tabla encoge hasta caber
        // y lo que se rompe es el texto de las celdas, sílaba a sílaba.
        const aMano = conTabla.filter((f) => /<table className="/.test(readFileSync(f, "utf8")));

        expect(
            aMano.map((f) => f.replace(RAIZ, "src")),
            "Usa CLASES_TABLA de shared/lib/clasesDeTabla",
        ).toEqual([]);
    });

    it("cada tabla vive dentro de un contenedor desplazable", () => {
        // El defecto real que esto vigila no era una barra fea: era media docena de tablas
        // metidas en una tarjeta con `overflow-hidden` —puesto para recortar las esquinas
        // redondeadas— que **anula el desplazamiento**. Las columnas de la derecha no había
        // forma de verlas en un teléfono.
        //
        // **Se cuenta tabla a tabla, no archivo a archivo, y no es un detalle.** La primera
        // versión de esta comprobación solo miraba si el archivo mencionaba la constante en
        // algún sitio, y por eso dio por buena `StockMovementsPage`: tiene dos tablas, la de
        // movimientos estaba envuelta y la de historial de precios no. Pasó el test y seguía
        // sin poder desplazarse.
        const desparejadas: string[] = [];

        for (const archivo of conTabla) {
            const contenido = readFileSync(archivo, "utf8");
            const tablas = (contenido.match(/<table/g) ?? []).length;
            const desplazadores = (contenido.match(/CLASES_TABLA_DESPLAZABLE/g) ?? []).length - 1; // menos el import

            if (desplazadores < tablas) {
                desparejadas.push(`${archivo.replace(RAIZ, "src")}: ${tablas} tablas, ${desplazadores} desplazadores`);
            }
        }

        expect(
            desparejadas,
            `Envuelve **cada** tabla en un div con CLASES_TABLA_DESPLAZABLE:\n${desparejadas.join("\n")}`,
        ).toEqual([]);
    });

    it("todo desplazador horizontal oculta su barra", () => {
        const conBarra: string[] = [];

        for (const archivo of archivos) {
            for (const clase of clases(readFileSync(archivo, "utf8"))) {
                if (clase.includes("overflow-x-auto") && !clase.includes("sin-barra")) {
                    conBarra.push(`${archivo.replace(RAIZ, "src")} → "${clase}"`);
                }
            }
        }

        expect(conBarra, `Les falta \`sin-barra\`:\n${conBarra.join("\n")}`).toEqual([]);
    });
});

describe("Menús desplegables en móvil", () => {
    const panel = readFileSync(join(RAIZ, "shared/components/DropdownButton.tsx"), "utf8");

    it("el panel se ancla a la izquierda hasta `sm`", () => {
        // Medido a 412 px: con `right-0` a secas y 176 px de ancho, el panel de «Exportar»
        // —que empieza cerca del margen izquierdo— se dibujaba en `left: -13px` y la
        // primera letra de cada opción quedaba fuera de la pantalla.
        expect(panel).toContain("absolute left-0 right-auto");
        expect(panel).toContain("sm:left-auto sm:right-0");
    });

    it("el panel nunca es más ancho que la pantalla", () => {
        expect(panel).toContain("max-w-[calc(100vw-2rem)]");
    });
});
