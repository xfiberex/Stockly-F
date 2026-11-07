import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import CategoriesPage from "@/modules/catalog/components/CategoriesPage";

/**
 * AUD-011 — el modal de Categorías y Marcas (los dos usan `CatalogItemSection`) se cierra cuando
 * la API confirma. Antes se cerraba al pulsar «Guardar»: si el guardado fallaba —un nombre
 * repetido, sin conexión—, lo escrito se perdía con él.
 */

const estado = vi.hoisted(() => ({ falla: false, creadas: [] as unknown[], editadas: [] as unknown[] }));

/** Una mutación que llama a `onSuccess` solo si no falla, como TanStack Query. */
const mutacion = (registro: unknown[]) => ({
    mutate: (vars: unknown, opciones?: { onSuccess?: () => void }) => {
        registro.push(vars);
        if (!estado.falla) opciones?.onSuccess?.();
    },
    isPending: false,
});

vi.mock("@/modules/auth/hooks/useMe", () => ({ useAuth: () => ({ user: { id: "u1", role: "ADMIN" } }) }));
vi.mock("@/modules/catalog/hooks/useCategories", () => ({
    useCategories: () => ({ data: [{ id: "c1", name: "Periféricos", description: null }], isLoading: false }),
}));
vi.mock("@/modules/catalog/hooks/useCategoryMutations", () => ({
    useCreateCategory: () => mutacion(estado.creadas),
    useUpdateCategory: () => mutacion(estado.editadas),
    useDeleteCategory: () => ({ mutate: vi.fn(), isPending: false }),
}));

beforeEach(() => {
    estado.falla = false;
    estado.creadas.length = 0;
    estado.editadas.length = 0;
});

async function crear(nombre: string) {
    const user = userEvent.setup();
    renderWithProviders(<CategoriesPage />);
    await user.click(screen.getByRole("button", { name: "Nueva categoría" }));
    const dialogo = screen.getByRole("dialog", { name: "Nueva categoría" });
    await user.type(within(dialogo).getByLabelText(/Nombre/), nombre);
    await user.click(within(dialogo).getByRole("button", { name: "Guardar" }));
    return user;
}

describe("Categorías y Marcas — el modal espera a la API (AUD-011)", () => {
    it("si crear falla, el modal sigue abierto con lo escrito", async () => {
        estado.falla = true;
        await crear("Cables");

        expect(estado.creadas).toEqual([{ name: "Cables", description: "" }]);
        const dialogo = screen.getByRole("dialog", { name: "Nueva categoría" });
        expect(within(dialogo).getByLabelText(/Nombre/)).toHaveValue("Cables");
    });

    it("si crear sale bien, el modal se cierra", async () => {
        await crear("Cables");

        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("si editar falla, el modal sigue abierto con el cambio", async () => {
        estado.falla = true;
        const user = userEvent.setup();
        renderWithProviders(<CategoriesPage />);
        await user.click(screen.getByRole("button", { name: "Editar" }));
        const dialogo = screen.getByRole("dialog", { name: "Editar categoría" });
        const nombre = within(dialogo).getByLabelText(/Nombre/);
        await user.clear(nombre);
        await user.type(nombre, "Periféricos USB");
        await user.click(within(dialogo).getByRole("button", { name: "Guardar" }));

        expect(estado.editadas).toHaveLength(1);
        expect(within(screen.getByRole("dialog")).getByLabelText(/Nombre/)).toHaveValue("Periféricos USB");
    });
});
