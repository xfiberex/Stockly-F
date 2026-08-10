import { toCsv, parseCsv, downloadBlob, blobCsv } from "@/modules/products/utils/importExport";
import type { ExportedProduct } from "@/modules/products/types/product.types";

const PRODUCTS: ExportedProduct[] = [
    { name: "Laptop Pro 15", description: "High performance", price: 1299.99, stock: 15, categoryName: "Electrónica", brandName: "LG", supplierName: null, isActive: true },
    { name: "Mouse Gamer", description: null, price: 45.00, stock: 50, categoryName: "Periféricos", brandName: null, supplierName: null, isActive: false },
    { name: 'Monitor 27"', description: 'Pantalla, HD', price: 299.99, stock: 8, categoryName: "Electrónica", brandName: null, supplierName: "TechDist", isActive: true },
];

describe("toCsv", () => {
    it("genera encabezados correctos", () => {
        const csv = toCsv(PRODUCTS);
        const firstLine = csv.split("\n")[0];
        expect(firstLine).toBe("name,description,price,stock,categoryName,brandName,supplierName,isActive");
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
            { name: "=HYPERLINK(0)", description: "+cmd", price: 10, stock: 1, categoryName: "@x", brandName: "-2", supplierName: null, isActive: true },
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
        expect(parsed[0].price).toBe(PRODUCTS[0].price);
        expect(parsed[0].categoryName).toBe(PRODUCTS[0].categoryName);
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
                price: 100,
                stock: 5,
                categoryName: "Electrónica",
                brandName: null,
                supplierName: null,
                isActive: true,
            },
        ]);

        const [producto] = parseCsv(csv);

        expect(producto.name).toBe("Cámara réflex");
        expect(producto.categoryName).toBe("Electrónica");
    });
});
