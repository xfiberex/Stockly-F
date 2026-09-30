import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { renderWithProviders } from "../utils";
import { EscanerModal } from "@/shared/components/EscanerModal";
import { EtiquetasModal } from "@/modules/products/components/EtiquetasModal";
import { ProductForm } from "@/modules/products/components/ProductForm";
import ProductsPage from "@/modules/products/components/ProductsPage";
import type { Rol } from "@/shared/contratos";
import type { Product, ProductWithAvailability } from "@/modules/products/types/product.types";

/**
 * T5-08 — el código de barras en la interfaz: el escáner y sus tres vías, lo que pasa en el
 * catálogo al escanear, el campo del formulario y el modal de etiquetas.
 *
 * La lectura de verdad —que una etiqueta impresa se vuelva a leer— no se puede comprobar en
 * jsdom, que no tiene cámara ni decodifica imágenes: la hace el E2E con el PDF real. Aquí el
 * lector es un doble, y lo que se vigila es qué hace la pantalla con lo que él devuelve.
 */

const detectar = vi.fn<(fuente: unknown) => Promise<string | null>>();
vi.mock("@/shared/lib/escaner", () => ({ obtenerLector: async () => ({ detectar }) }));

const getProductByCode = vi.fn<(codigo: string) => Promise<ProductWithAvailability>>();
const descargarEtiquetas = vi.fn<(ids: string[], formato: string, copias: number) => Promise<boolean>>();
const createProduct = vi.fn();
const updateProduct = vi.fn();
vi.mock("@/modules/products/api/product.api", async (original) => ({
    ...(await original<typeof import("@/modules/products/api/product.api")>()),
    getProductByCode: (codigo: string) => getProductByCode(codigo),
    descargarEtiquetas: (ids: string[], formato: string, copias: number) => descargarEtiquetas(ids, formato, copias),
}));
vi.mock("@/modules/products/hooks/useCreateProduct", () => ({
    useCreateProduct: () => ({ mutate: createProduct, isPending: false }),
}));
vi.mock("@/modules/products/hooks/useUpdateProduct", () => ({
    useUpdateProduct: () => ({ mutate: updateProduct, isPending: false }),
}));

const PRODUCTO: ProductWithAvailability = {
    id: "p1",
    name: "Teclado Logitech",
    description: null,
    sku: "PER-LOG",
    barcode: "4006381333931",
    price: "100.00",
    costPrice: null,
    stock: 5,
    minStock: 1,
    imageUrl: null,
    imagePublicId: null,
    categoryId: null,
    brandId: null,
    supplierId: null,
    category: null,
    brand: null,
    supplier: null,
    tags: [],
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    committedStock: 0,
    availableStock: 5,
    abcClass: "A",
};

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({
        data: { data: [PRODUCTO, { ...PRODUCTO, id: "p2", name: "Cable sin código", sku: null, barcode: null }], meta: { total: 2, page: 1, limit: 10, totalPages: 1 } },
        isLoading: false,
    }),
}));
vi.mock("@/modules/reports/hooks/useReports", () => ({ useAbcSummary: () => ({ data: undefined }) }));
vi.mock("@/modules/products/hooks/useImportProducts", () => ({ useImportProducts: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/modules/products/hooks/useDeleteProduct", () => ({ useDeleteProduct: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/modules/products/hooks/useRestoreProduct", () => ({ useRestoreProduct: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/modules/catalog/hooks/useCategories", () => ({ useCategories: () => ({ data: [] }) }));
vi.mock("@/modules/catalog/hooks/useBrands", () => ({ useBrands: () => ({ data: [] }) }));
vi.mock("@/modules/suppliers/hooks/useSuppliers", () => ({ useSuppliers: () => ({ data: [] }) }));
vi.mock("@/modules/tags/hooks/useTags", () => ({ useTags: () => ({ data: [] }) }));

let rol: Rol = "ADMIN";
vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Ana", email: "a@b.c", role: rol }, isLoading: false }),
}));

const noEncontrado = () =>
    new AxiosError("404", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 404, statusText: "Not Found", headers: {}, config: { headers: new AxiosHeaders() },
        data: { success: false, message: "x", code: "PRODUCT_NOT_FOUND" },
    });

beforeEach(() => {
    rol = "ADMIN";
    detectar.mockReset();
    getProductByCode.mockReset();
    descargarEtiquetas.mockReset().mockResolvedValue(true);
    createProduct.mockReset();
    updateProduct.mockReset();
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({})));
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("El escáner (T5-08)", () => {
    it("sin conexión segura lo dice y deja la foto y el campo, sin pedir la cámara", async () => {
        const getUserMedia = vi.fn();
        vi.stubGlobal("isSecureContext", false);
        Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });

        renderWithProviders(<EscanerModal isOpen onClose={vi.fn()} onCodigo={vi.fn()} />);

        expect(await screen.findByText(/solo da la cámara en una conexión segura/)).toBeInTheDocument();
        expect(getUserMedia).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Hacer o elegir una foto" })).toBeInTheDocument();
        expect(screen.getByLabelText("O escríbelo")).toBeInTheDocument();
    });

    it("escrito —como lo teclea una pistola USB, con Intro— entrega el código sin espacios", async () => {
        const onCodigo = vi.fn();
        const user = userEvent.setup();
        renderWithProviders(<EscanerModal isOpen onClose={vi.fn()} onCodigo={onCodigo} />);

        expect(screen.getByRole("button", { name: "Buscar" })).toBeDisabled();
        await user.type(screen.getByLabelText("O escríbelo"), "  4006381333931 {Enter}");

        expect(onCodigo).toHaveBeenCalledWith("4006381333931");
    });

    it("de una foto: entrega lo leído, o avisa si no había código", async () => {
        const onCodigo = vi.fn();
        renderWithProviders(<EscanerModal isOpen onClose={vi.fn()} onCodigo={onCodigo} />);
        const foto = new File(["x"], "etiqueta.png", { type: "image/png" });

        detectar.mockResolvedValueOnce(null);
        fireEvent.change(screen.getByTestId("escaner-foto"), { target: { files: [foto] } });
        expect(await screen.findByRole("alert")).toHaveTextContent("No se encontró ningún código en la foto");
        expect(onCodigo).not.toHaveBeenCalled();

        detectar.mockResolvedValueOnce("PER-LOG");
        fireEvent.change(screen.getByTestId("escaner-foto"), { target: { files: [foto] } });
        await waitFor(() => expect(onCodigo).toHaveBeenCalledWith("PER-LOG"));
    });

    describe("con cámara", () => {
        const stop = vi.fn();
        const getUserMedia = vi.fn();

        beforeEach(() => {
            stop.mockReset();
            getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [{ stop }] });
            vi.stubGlobal("isSecureContext", true);
            Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
            vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
            vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(4);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("pide la cámara trasera, entrega **un** código por apertura y la apaga al cerrar", async () => {
            detectar.mockResolvedValueOnce(null).mockResolvedValue("4006381333931");
            const onCodigo = vi.fn();
            const user = userEvent.setup();
            const { rerender } = renderWithProviders(<EscanerModal isOpen onClose={vi.fn()} onCodigo={onCodigo} />);

            await waitFor(() => expect(onCodigo).toHaveBeenCalledWith("4006381333931"));
            expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: "environment" } }, audio: false });
            // Quien llama aún no ha cerrado: un Intro en el campo no manda un segundo código.
            await user.type(screen.getByLabelText("O escríbelo"), "OTRO{Enter}");
            expect(onCodigo).toHaveBeenCalledTimes(1);

            rerender(<EscanerModal isOpen={false} onClose={vi.fn()} onCodigo={onCodigo} />);
            expect(stop).toHaveBeenCalled();
        });

        it("con el permiso denegado lo dice", async () => {
            getUserMedia.mockRejectedValue(new DOMException("no", "NotAllowedError"));

            renderWithProviders(<EscanerModal isOpen onClose={vi.fn()} onCodigo={vi.fn()} />);

            expect(await screen.findByText(/No hay permiso para usar la cámara/)).toBeInTheDocument();
        });
    });
});

describe("Escanear en el catálogo (T5-08)", () => {
    // Sin conexión segura en jsdom: se escribe el código, que recorre el mismo camino.
    async function escanear(codigo: string) {
        const user = userEvent.setup();
        renderWithProviders(<ProductsPage />);
        await user.click(screen.getByRole("button", { name: "Escanear" }));
        await user.type(screen.getByLabelText("O escríbelo"), `${codigo}{Enter}`);
        return user;
    }

    it("un código que existe abre su ficha, con el código de barras a la vista", async () => {
        getProductByCode.mockResolvedValue(PRODUCTO);

        await escanear("4006381333931");

        const ficha = await screen.findByRole("dialog", { name: "Detalle del producto" });
        expect(getProductByCode).toHaveBeenCalledWith("4006381333931");
        expect(within(ficha).getByText("Teclado Logitech")).toBeInTheDocument();
        expect(within(ficha).getByText("4006381333931")).toBeInTheDocument();
    });

    it("uno desconocido ofrece darlo de alta, y el formulario nace con el código puesto", async () => {
        getProductByCode.mockRejectedValue(noEncontrado());
        const user = await escanear("8412345678905");

        const aviso = await screen.findByRole("dialog", { name: "Código sin producto" });
        expect(within(aviso).getByText(/Ningún producto tiene el código «8412345678905»/)).toBeInTheDocument();
        await user.click(within(aviso).getByRole("button", { name: "Darlo de alta con este código" }));

        const formulario = await screen.findByRole("dialog", { name: "Nuevo producto" });
        expect(within(formulario).getByLabelText("Código de barras")).toHaveValue("8412345678905");
    });

    it("quien no puede crear productos ve el aviso sin la opción de darlo de alta", async () => {
        rol = "WAREHOUSE";
        getProductByCode.mockRejectedValue(noEncontrado());

        await escanear("8412345678905");

        const aviso = await screen.findByRole("dialog", { name: "Código sin producto" });
        expect(within(aviso).queryByRole("button", { name: /Darlo de alta/ })).toBeNull();
        expect(within(aviso).getByRole("button", { name: "Escanear otro" })).toBeInTheDocument();
    });

    it("las etiquetas de lo seleccionado apartan lo que no tiene código, y lo dicen", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductsPage />);

        await user.click(screen.getByRole("checkbox", { name: "Seleccionar Teclado Logitech" }));
        await user.click(screen.getByRole("checkbox", { name: "Seleccionar Cable sin código" }));
        await user.click(screen.getByRole("button", { name: "Etiquetas" }));

        const modal = screen.getByRole("dialog", { name: "Imprimir etiquetas" });
        expect(within(modal).getByText("1 producto no tiene código de barras ni SKU y se queda fuera.")).toBeInTheDocument();
        await user.click(within(modal).getByRole("button", { name: "Descargar 1 etiqueta" }));
        expect(descargarEtiquetas).toHaveBeenCalledWith(["p1"], "sheet", 1);
    });
});

describe("El campo del formulario (T5-08)", () => {
    it("un EAN con el dígito de control mal no se envía", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} />);

        await user.type(screen.getByLabelText("Nombre *"), "Teclado");
        await user.type(screen.getByLabelText("Precio *"), "10");
        await user.type(screen.getByLabelText("Código de barras"), "4006381333932");
        await user.click(screen.getByRole("button", { name: "Crear producto" }));

        expect(await screen.findByText(/El dígito de control no cuadra/)).toBeInTheDocument();
        expect(createProduct).not.toHaveBeenCalled();
    });

    it("al editar, vaciarlo lo quita: viaja la cadena vacía", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} product={PRODUCTO as Product} />);

        await user.clear(screen.getByLabelText("Código de barras"));
        await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

        await waitFor(() => expect(updateProduct).toHaveBeenCalled());
        expect(updateProduct.mock.calls[0]![0].dto.barcode).toBe("");
    });

    it("escanear desde el formulario rellena el campo sin cerrar el formulario", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} />);

        await user.click(screen.getByRole("button", { name: "Escanear" }));
        await user.type(screen.getByLabelText("O escríbelo"), "96385074{Enter}");

        expect(screen.queryByRole("dialog", { name: "Escanear un código" })).toBeNull();
        expect(screen.getByLabelText("Código de barras")).toHaveValue("96385074");
    });
});

describe("Etiquetas (T5-08)", () => {
    const productos = [{ id: "p1", name: "Teclado", sku: "PER-1", barcode: null }];

    it("pide el formato y las copias elegidos, y se cierra solo si la descarga salió", async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        renderWithProviders(<EtiquetasModal isOpen onClose={onClose} productos={productos} />);

        await user.click(screen.getByRole("radio", { name: /Rollo/ }));
        await user.clear(screen.getByLabelText("Copias de cada una"));
        await user.type(screen.getByLabelText("Copias de cada una"), "3");
        descargarEtiquetas.mockResolvedValueOnce(false);
        await user.click(screen.getByRole("button", { name: "Descargar 3 etiquetas" }));

        expect(descargarEtiquetas).toHaveBeenCalledWith(["p1"], "label", 3);
        expect(onClose).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Descargar 3 etiquetas" }));
        expect(onClose).toHaveBeenCalled();
    });

    it("unas copias imposibles no se piden", async () => {
        const user = userEvent.setup();
        renderWithProviders(<EtiquetasModal isOpen onClose={vi.fn()} productos={productos} />);

        await user.clear(screen.getByLabelText("Copias de cada una"));
        await user.type(screen.getByLabelText("Copias de cada una"), "2001");

        expect(screen.getByText(/hasta 2000 etiquetas en total/)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Descargar/ })).toBeDisabled();
    });
});
