import { screen, within } from "@testing-library/react";
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

// T2-13: los diez selectores eran botones sin texto, y cuál estaba elegido se veía
// solo en un contorno CSS. Para quien no distingue los tonos —o no ve la pantalla—
// eran diez «botón» idénticos.
describe("TagsPage — selectores de color accesibles (T2-13)", () => {
    it("cada color tiene nombre y los diez están agrupados bajo «Color»", async () => {
        const user = userEvent.setup();
        renderWithProviders(<TagsPage />);
        await user.click(screen.getByRole("button", { name: "Nueva etiqueta" }));

        const grupo = screen.getByRole("group", { name: "Color" });
        const colores = within(grupo).getAllByRole("button");

        expect(colores).toHaveLength(10);
        expect(within(grupo).getByRole("button", { name: "Azul" })).toBeInTheDocument();
        expect(within(grupo).getByRole("button", { name: "Rojo" })).toBeInTheDocument();
    });

    it("`aria-pressed` dice cuál está elegido, y solo uno lo está", async () => {
        const user = userEvent.setup();
        renderWithProviders(<TagsPage />);
        await user.click(screen.getByRole("button", { name: "Nueva etiqueta" }));

        const grupo = screen.getByRole("group", { name: "Color" });
        const pulsados = () =>
            within(grupo).getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true");

        // El formulario nace con el primer color puesto.
        expect(pulsados().map((b) => b.getAttribute("aria-label"))).toEqual(["Azul"]);

        await user.click(within(grupo).getByRole("button", { name: "Naranja" }));

        expect(pulsados().map((b) => b.getAttribute("aria-label"))).toEqual(["Naranja"]);
    });

    it("editar una etiqueta marca su color como elegido", async () => {
        const user = userEvent.setup();
        renderWithProviders(<TagsPage />);

        // «Oferta» es `#ef4444`, que es el rojo de la paleta.
        await user.click(screen.getByRole("button", { name: "Editar Oferta" }));

        const grupo = screen.getByRole("group", { name: "Color" });
        expect(within(grupo).getByRole("button", { name: "Rojo" })).toHaveAttribute("aria-pressed", "true");
    });
});
