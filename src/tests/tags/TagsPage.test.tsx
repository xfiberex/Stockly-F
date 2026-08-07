import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import TagsPage from "@/modules/tags/components/TagsPage";

const etiquetas = [
    { id: "tag-1", name: "Oferta", color: "#ef4444" },
    { id: "tag-2", name: "Novedad", color: "#22c55e" },
];

vi.mock("@/modules/tags/hooks/useTags", () => ({
    useTags: () => ({ data: etiquetas, isLoading: false }),
    useCreateTag: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateTag: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteTag: () => ({ mutate: vi.fn(), isPending: false }),
}));

// `TagFormModal` está montado de forma permanente y `useForm` solo aplica
// `defaultValues` en el primer montaje. Sin la `key` de T1-17, editar abría el
// formulario vacío y, peor, conservaba lo de la etiqueta anterior.
describe("TagsPage — precarga del formulario (T1-17)", () => {
    it("editar una etiqueta abre el modal con su nombre precargado", async () => {
        const user = userEvent.setup();
        renderWithProviders(<TagsPage />);

        await user.click(screen.getByRole("button", { name: "Editar Oferta" }));

        expect(screen.getByText("Editar etiqueta")).toBeInTheDocument();
        expect(screen.getByLabelText("Nombre *")).toHaveValue("Oferta");
    });

    it("editar una segunda etiqueta muestra los datos de esa, no los de la anterior", async () => {
        const user = userEvent.setup();
        renderWithProviders(<TagsPage />);

        await user.click(screen.getByRole("button", { name: "Editar Oferta" }));
        expect(screen.getByLabelText("Nombre *")).toHaveValue("Oferta");

        await user.click(screen.getByRole("button", { name: /cancelar/i }));
        await user.click(screen.getByRole("button", { name: "Editar Novedad" }));

        expect(screen.getByLabelText("Nombre *")).toHaveValue("Novedad");
    });

    it("«Nueva etiqueta» abre el modal vacío después de haber editado una", async () => {
        const user = userEvent.setup();
        renderWithProviders(<TagsPage />);

        await user.click(screen.getByRole("button", { name: "Editar Oferta" }));
        await user.click(screen.getByRole("button", { name: /cancelar/i }));

        await user.click(screen.getByRole("button", { name: /nueva etiqueta/i }));

        // «Nueva etiqueta» es a la vez el botón de la cabecera y el título del modal;
        // el botón de envío distingue el modo sin ambigüedad.
        expect(screen.getByRole("button", { name: /crear etiqueta/i })).toBeInTheDocument();
        expect(screen.getByLabelText("Nombre *")).toHaveValue("");
    });
});
