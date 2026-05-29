import { toCsv, parseCsv, downloadBlob } from "@/modules/products/utils/importExport";
import type { ExportedProduct } from "@/modules/products/types/product.types";

const PRODUCTS: ExportedProduct[] = [
    { name: "Laptop Pro 15", description: "High performance", price: 1299.99, stock: 15, category: "Electrónica", isActive: true },
    { name: "Mouse Gamer", description: null, price: 45.00, stock: 50, category: "Periféricos", isActive: false },
    { name: 'Monitor 27"', description: 'Pantalla, HD', price: 299.99, stock: 8, category: "Electrónica", isActive: true },
];

describe("toCsv", () => {
    it("genera encabezados correctos", () => {
        const csv = toCsv(PRODUCTS);
        const firstLine = csv.split("\n")[0];
        expect(firstLine).toBe("name,description,price,stock,category,isActive");
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
});

describe("parseCsv", () => {
    it("parsea un CSV simple correctamente", () => {
        const csv = "name,price,stock,category\nLaptop,999.99,10,Electrónica";
        const result = parseCsv(csv);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ name: "Laptop", price: 999.99, stock: 10, category: "Electrónica" });
    });

    it("maneja campos con comillas y comas", () => {
        const csv = 'name,description,price,stock,category\n"Monitor, HD","Pantalla, Full HD",299.99,8,Electrónica';
        const result = parseCsv(csv);
        expect(result[0].name).toBe("Monitor, HD");
        expect(result[0].description).toBe("Pantalla, Full HD");
    });

    it("convierte description vacía a undefined", () => {
        const csv = "name,description,price,stock,category\nMouse,,45,50,Periféricos";
        const result = parseCsv(csv);
        expect(result[0].description).toBeUndefined();
    });

    it("parsea isActive como booleano", () => {
        const csv = "name,price,stock,category,isActive\nProducto,10,5,Audio,false";
        const result = parseCsv(csv);
        expect(result[0].isActive).toBe(false);
    });

    it("trata isActive=true correctamente", () => {
        const csv = "name,price,stock,category,isActive\nProducto,10,5,Audio,true";
        const result = parseCsv(csv);
        expect(result[0].isActive).toBe(true);
    });

    it("omite isActive cuando la columna no existe", () => {
        const csv = "name,price,stock,category\nProducto,10,5,Audio";
        const result = parseCsv(csv);
        expect(result[0].isActive).toBeUndefined();
    });

    it("lanza error si solo hay encabezado sin datos", () => {
        const csv = "name,price,category";
        expect(() => parseCsv(csv)).toThrow();
    });

    it("parsea el CSV generado por toCsv correctamente (round-trip)", () => {
        const csv = toCsv(PRODUCTS);
        const parsed = parseCsv(csv);
        expect(parsed).toHaveLength(PRODUCTS.length);
        expect(parsed[0].name).toBe(PRODUCTS[0].name);
        expect(parsed[0].price).toBe(PRODUCTS[0].price);
        expect(parsed[0].category).toBe(PRODUCTS[0].category);
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
