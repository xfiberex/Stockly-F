import { toCsv, parseCsv, downloadBlob, blobCsv } from "@/modules/products/utils/importExport";
import type { ExportedProduct } from "@/modules/products/types/product.types";

/**
 * T3-05 — la cabecera canónica, palabra por palabra.
 *
 * Esta misma cadena está fijada en `Stockly-B/src/tests/export-streaming.test.ts`. Es lo
 * único que impide que los dos productores de CSV —este, en el navegador, y el del
 * backend, que transmite por lotes— se vuelvan a separar: no comparten paquete, así que
 * el acuerdo se sostiene sobre que cambiar un lado ponga en rojo su propio repositorio.
 */
const CABECERA_CANONICA =
    "name,description,sku,price,stock,minStock,isActive,categoryName,brandName,supplierName,tags";

// `price` como cadena y `tags` unidos por `;`: es lo que devuelve el backend de verdad,
// comprobado sobre la respuesta real (`price` es `Decimal` en Prisma y se serializa así).
const PRODUCTS: ExportedProduct[] = [
    { name: "Laptop Pro 15", description: "High performance", sku: "LAP-15", price: "1299.99", stock: 15, minStock: 3, isActive: true, categoryName: "Electrónica", brandName: "LG", supplierName: null, tags: "Oferta;Novedad" },
    { name: "Mouse Gamer", description: null, sku: null, price: "45", stock: 50, minStock: 10, isActive: false, categoryName: "Periféricos", brandName: null, supplierName: null, tags: "" },
    { name: 'Monitor 27"', description: 'Pantalla, HD', sku: null, price: "299.99", stock: 8, minStock: 2, isActive: true, categoryName: "Electrónica", brandName: null, supplierName: "TechDist", tags: "" },
];

describe("toCsv", () => {
    it("genera la misma cabecera que la exportación del backend", () => {
        const csv = toCsv(PRODUCTS);
        const firstLine = csv.split("\n")[0];
        expect(firstLine).toBe(CABECERA_CANONICA);
    });

    it("incluye las tres columnas que antes se descartaban", () => {
        // `sku`, `minStock` y `tags` ya venían en la respuesta del backend; este lado los
        // tiraba porque `ExportedProduct` no los declaraba. El archivo de la interfaz
        // salía con ocho columnas y el de la API con once.
        const filaLaptop = toCsv(PRODUCTS).split("\n")[1];
        expect(filaLaptop).toContain("LAP-15");
        expect(filaLaptop).toContain("Oferta;Novedad");
        expect(toCsv(PRODUCTS).split("\n")[0].split(",")).toHaveLength(11);
    });

    it("genera una fila por producto", () => {
        const csv = toCsv(PRODUCTS);
        const lines = csv.split("\n");
        expect(lines).toHaveLength(PRODUCTS.length + 1);
    });

    it("escapa campos con comas dentro", () => {
        const csv = toCsv(PRODUCTS);
        expect(csv).toContain('"Pantalla, HD"');
    });

    it("escapa campos con comillas dobles", () => {
        const csv = toCsv(PRODUCTS);
        expect(csv).toContain('"Monitor 27"""');
    });

    it("convierte null a cadena vacía", () => {
        const csv = toCsv(PRODUCTS);
        const mouseRow = csv.split("\n")[2];
        expect(mouseRow).toMatch(/^Mouse Gamer,,/);
    });

    it("neutraliza inyección de fórmulas anteponiendo un apóstrofo", () => {
        const malicious: ExportedProduct[] = [
            { name: "=HYPERLINK(0)", description: "+cmd", sku: null, price: 10, stock: 1, minStock: 0, isActive: true, categoryName: "@x", brandName: "-2", supplierName: null, tags: "" },
        ];
        const row = toCsv(malicious).split("\n")[1];
        expect(row).toContain("'=HYPERLINK(0)");
        expect(row).toContain("'+cmd");
        expect(row).toContain("'@x");
        expect(row).toContain("'-2");
    });
});

describe("parseCsv", () => {
    it("parsea un CSV simple correctamente", () => {
        const csv = "name,price,stock,categoryName\nLaptop,999.99,10,Electrónica";
        const result = parseCsv(csv);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ name: "Laptop", price: 999.99, stock: 10, categoryName: "Electrónica" });
    });

    it("maneja campos con comillas y comas", () => {
        const csv = 'name,description,price,stock,categoryName\n"Monitor, HD","Pantalla, Full HD",299.99,8,Electrónica';
        const result = parseCsv(csv);
        expect(result[0].name).toBe("Monitor, HD");
        expect(result[0].description).toBe("Pantalla, Full HD");
    });

    it("convierte description vacía a undefined", () => {
        const csv = "name,description,price,stock,categoryName\nMouse,,45,50,Periféricos";
        const result = parseCsv(csv);
        expect(result[0].description).toBeUndefined();
    });

    it("parsea isActive como booleano", () => {
        const csv = "name,price,stock,isActive\nProducto,10,5,false";
        const result = parseCsv(csv);
        expect(result[0].isActive).toBe(false);
    });

    it("trata isActive=true correctamente", () => {
        const csv = "name,price,stock,isActive\nProducto,10,5,true";
        const result = parseCsv(csv);
        expect(result[0].isActive).toBe(true);
    });

    it("omite isActive cuando la columna no existe", () => {
        const csv = "name,price,stock\nProducto,10,5";
        const result = parseCsv(csv);
        expect(result[0].isActive).toBeUndefined();
    });

    it("lanza error si solo hay encabezado sin datos", () => {
        const csv = "name,price,categoryName";
        expect(() => parseCsv(csv)).toThrow();
    });

    it("parsea el CSV generado por toCsv correctamente (round-trip)", () => {
        const csv = toCsv(PRODUCTS);
        const parsed = parseCsv(csv);
        expect(parsed).toHaveLength(PRODUCTS.length);
        expect(parsed[0].name).toBe(PRODUCTS[0].name);
        // El precio viaja como cadena (`Decimal` en Prisma) y vuelve como número: el
        // valor sobrevive, el tipo no. Comparar con `Number(...)` lo deja explícito en
        // vez de esconderlo detrás de una igualdad laxa.
        expect(parsed[0].price).toBe(Number(PRODUCTS[0].price));
        expect(parsed[0].categoryName).toBe(PRODUCTS[0].categoryName);
    });

    it("T3-05: las columnas nuevas se ignoran al reimportar, no se malinterpretan", () => {
        // `parseCsv` lee por nombre de columna, así que las cuatro que el importador no
        // entiende —`sku`, `minStock`, `supplierName` y `tags`— sobran sin descolocar el
        // resto. La exportación es más rica que el formato de entrada, y así se queda:
        // ampliar el importador es otra tarea, no un efecto colateral de esta.
        const parsed = parseCsv(toCsv(PRODUCTS));

        expect(parsed[0]).not.toHaveProperty("sku");
        expect(parsed[0]).not.toHaveProperty("tags");
        expect(parsed[0].stock).toBe(15);
        expect(parsed[0].brandName).toBe("LG");
        expect(parsed[0].isActive).toBe(true);
    });
});

describe("downloadBlob", () => {
    it("crea un enlace temporal y lo activa", () => {
        const createObjectURL = vi.fn().mockReturnValue("blob:test");
        const revokeObjectURL = vi.fn();
        const click = vi.fn();

        Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, writable: true });
        Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, writable: true });

        const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
            if (tag === "a") return { href: "", download: "", click } as unknown as HTMLAnchorElement;
            return document.createElement(tag);
        });

        const blob = new Blob(["test"], { type: "text/plain" });
        downloadBlob(blob, "test.txt");

        expect(createObjectURL).toHaveBeenCalledWith(blob);
        expect(click).toHaveBeenCalled();
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");

        createElementSpy.mockRestore();
    });
});

// T2-34: los CSV se generaban sin marca de orden de bytes, así que Excel en Windows los
// abría con la página de códigos del sistema y cualquier acento salía roto. No se nota
// en un editor de texto —ahí se ven bien—, solo al abrir el archivo en Excel.
describe("blobCsv (T2-34)", () => {
    it("antepone la marca de orden de bytes", async () => {
        const blob = blobCsv("name,price\nCámara,10");

        // Se miran los **bytes**, no `blob.text()`: ese decodifica con `TextDecoder`, que se
        // come la marca salvo que se le pida `ignoreBOM`. Comprobarlo por texto daba un fallo
        // desconcertante —la marca estaba puesta y el test decía que no— y aquí lo que importa
        // es justo lo que Excel encuentra al abrir el archivo: los bytes EF BB BF.
        const bytes = new Uint8Array(await blob.arrayBuffer());
        expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
        expect(await blob.text()).toContain("Cámara,10");
    });

    it("declara el tipo y la codificación", () => {
        expect(blobCsv("a,b").type).toBe("text/csv;charset=utf-8;");
    });

    it("un CSV exportado se puede volver a importar pese a la marca", () => {
        // `parseCsv` empieza con `text.trim()`, y `trim()` elimina `U+FEFF` porque el
        // estándar lo cuenta como espacio en blanco. Es una casualidad afortunada, no
        // algo evidente al leer el código: sin este test, el día que alguien cambie ese
        // `trim()` por otra cosa, la primera columna pasa a llamarse «\uFEFFname» y
        // todos los productos se importan sin nombre.
        const csv = "\uFEFF" + toCsv([
            {
                name: "Cámara réflex",
                description: "con acentuación",
                sku: null,
                price: 100,
                stock: 5,
                minStock: 1,
                isActive: true,
                categoryName: "Electrónica",
                brandName: null,
                supplierName: null,
                tags: "",
            },
        ]);

        const [producto] = parseCsv(csv);

        expect(producto.name).toBe("Cámara réflex");
        expect(producto.categoryName).toBe("Electrónica");
    });
});
