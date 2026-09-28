import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import SuppliersPage from "@/modules/suppliers/components/SuppliersPage";
import type { Supplier } from "@/modules/suppliers/types/supplier.types";

/**
 * T5-05 — el plazo de entrega del proveedor.
 *
 * Vacío y cero **no son lo mismo**: vacío es «no se sabe» y la reposición usa el plazo por
 * defecto; cero es «entrega en el día». El formulario los tiene que mandar distintos —`null` y
 * `0`—, y es justo lo que se confunde al pasar el texto de un campo por `Number("")`.
 */

const proveedor = (over: Partial<Supplier>): Supplier => ({
    id: "s1",
    name: "Norte",
    email: null,
    phone: null,
    notes: null,
    leadTimeDays: null,
    createdAt: "",
    updatedAt: "",
    ...over,
});

let proveedores: Supplier[] = [];
const creados: unknown[] = [];
const actualizados: unknown[] = [];

vi.mock("@/modules/suppliers/hooks/useSuppliers", () => ({
    useSuppliers: () => ({ data: proveedores, isLoading: false }),
}));

vi.mock("@/modules/suppliers/hooks/useSupplierMutations", () => ({
    useCreateSupplier: () => ({
        mutate: (v: unknown, opciones?: { onSuccess?: () => void }) => { creados.push(v); opciones?.onSuccess?.(); },
        isPending: false,
    }),
    useUpdateSupplier: () => ({
        mutate: (v: unknown, opciones?: { onSuccess?: () => void }) => { actualizados.push(v); opciones?.onSuccess?.(); },
        isPending: false,
    }),
    useDeleteSupplier: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: "ADMIN" } }),
}));

describe("Plazo de entrega del proveedor (T5-05)", () => {
    beforeEach(() => {
        proveedores = [proveedor({ id: "a", name: "Con plazo", leadTimeDays: 3 }), proveedor({ id: "b", name: "Sin plazo" })];
        creados.length = 0;
        actualizados.length = 0;
    });

    it("la tabla enseña el plazo, o un guion si no lo hay", () => {
        renderWithProviders(<SuppliersPage />);

        expect(screen.getByRole("row", { name: /Con plazo/ })).toHaveTextContent("3 días");
        expect(screen.getByRole("row", { name: /Sin plazo/ })).not.toHaveTextContent("días");
    });

    it("vacío se envía como null y cero como 0", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SuppliersPage />);

        await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
        await user.type(screen.getByLabelText(/Nombre/), "Sin saber");
        await user.click(screen.getByRole("button", { name: "Guardar" }));

        await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
        await user.type(screen.getByLabelText(/Nombre/), "En el día");
        await user.type(screen.getByLabelText("Plazo de entrega (días)"), "0");
        await user.click(screen.getByRole("button", { name: "Guardar" }));

        expect(creados).toEqual([
            expect.objectContaining({ name: "Sin saber", leadTimeDays: null }),
            expect.objectContaining({ name: "En el día", leadTimeDays: 0 }),
        ]);
    });

    it("«Nuevo» tras crear otro se abre vacío", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SuppliersPage />);

        await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
        await user.type(screen.getByLabelText(/Nombre/), "Primero");
        await user.type(screen.getByLabelText("Plazo de entrega (días)"), "4");
        await user.click(screen.getByRole("button", { name: "Guardar" }));
        await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));

        expect(screen.getByLabelText(/Nombre/)).toHaveValue("");
        expect(screen.getByLabelText("Plazo de entrega (días)")).toHaveValue(null);
    });

    it("editar arranca con el plazo guardado, y vaciarlo lo borra", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SuppliersPage />);

        await user.click(screen.getAllByRole("button", { name: "Editar" })[0]!);
        const campo = screen.getByLabelText("Plazo de entrega (días)");
        expect(campo).toHaveValue(3);

        await user.clear(campo);
        await user.click(screen.getByRole("button", { name: "Guardar" }));

        expect(actualizados).toEqual([{ id: "a", form: expect.objectContaining({ leadTimeDays: null }) }]);
    });

    it.each([["-1"], ["2.5"], ["366"]])("rechaza %s sin llegar al servidor", async (valor) => {
        const user = userEvent.setup();
        renderWithProviders(<SuppliersPage />);

        await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
        await user.type(screen.getByLabelText(/Nombre/), "Malo");
        // Pegado y no tecleado: jsdom descarta el «2.» intermedio de un campo numérico y «2.5»
        // acabaría siendo «25», que es válido.
        await user.click(screen.getByLabelText("Plazo de entrega (días)"));
        await user.paste(valor);
        await user.click(screen.getByRole("button", { name: "Guardar" }));

        expect(await screen.findByText("Un número entero de días entre 0 y 365")).toBeInTheDocument();
        expect(creados).toEqual([]);
    });
});
