import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import UsersPage from "@/modules/users/components/UsersPage";
import type { AppUser } from "@/modules/users/types/users.types";

// T2-20: la página estaba al 0 % y sus dos acciones son destructivas —cambiar el rol de
// alguien y desactivarle la cuenta—. Lo que más importa cubrir es lo que **no** debe
// poder hacerse: actuar sobre uno mismo, que el backend rechaza con 400 y que aquí
// tiene que estar deshabilitado antes de llegar a pedirlo.

const YO = "u-admin";

function usuario(over: Partial<AppUser> = {}): AppUser {
    return {
        id: "u-1",
        name: "Laura Gómez",
        email: "laura@stockly.app",
        role: "USER",
        isActive: true,
        isVerified: true,
        createdAt: "2026-03-15T10:00:00.000Z",
        ...over,
    } as AppUser;
}

let usuarios: AppUser[] = [];
let total = 0;
let cargando = false;
const consultas: unknown[] = [];
const cambiarRol = vi.fn();
const cambiarActivo = vi.fn();

vi.mock("@/modules/users/hooks/useUsers", () => ({
    useUsers: (params: unknown) => {
        consultas.push(params);
        return {
            data: { data: usuarios, meta: { total, page: 1, limit: 20, totalPages: Math.ceil(total / 20) } },
            isLoading: cargando,
        };
    },
    useUpdateUserRole: () => ({ mutate: cambiarRol, isPending: false }),
    useSetUserActive: () => ({ mutate: cambiarActivo, isPending: false }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: YO, name: "Admin", role: "ADMIN" } }),
}));

/** La fila de un usuario, por su nombre. */
function fila(nombre: string) {
    return screen.getByText(nombre).closest("tr")!;
}

describe("UsersPage (T2-20)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        consultas.length = 0;
        cargando = false;
        usuarios = [usuario(), usuario({ id: YO, name: "Admin Principal", email: "admin@stockly.app", role: "ADMIN" })];
        total = 2;
    });

    it("lista los usuarios con su rol y su estado", () => {
        renderWithProviders(<UsersPage />);

        expect(screen.getByText("2 usuarios registrados")).toBeInTheDocument();
        // `:not(option)` porque «Usuario» y «Admin» son además las opciones del
        // selector de rol que hay en la misma fila.
        expect(within(fila("Laura Gómez")).getByText("Usuario", { selector: ":not(option)" })).toBeInTheDocument();
        expect(within(fila("Admin Principal")).getByText("Admin", { selector: ":not(option)" })).toBeInTheDocument();
        expect(within(fila("Laura Gómez")).getByText("Activo")).toBeInTheDocument();
    });

    it("marca cuál eres tú y no te deja actuar sobre tu propia cuenta", () => {
        renderWithProviders(<UsersPage />);

        const propia = fila("Admin Principal");
        expect(within(propia).getByText("(tú)")).toBeInTheDocument();
        // El backend responde 400; la interfaz no llega ni a pedirlo.
        expect(within(propia).getByRole("combobox")).toBeDisabled();
        expect(within(propia).getByRole("button", { name: "Desactivar" })).toBeDisabled();
    });

    it("cambiar el rol de otra persona llama a la API con el rol nuevo", async () => {
        const user = userEvent.setup();
        renderWithProviders(<UsersPage />);

        await user.selectOptions(within(fila("Laura Gómez")).getByRole("combobox"), "ADMIN");

        expect(cambiarRol).toHaveBeenCalledWith({ id: "u-1", role: "ADMIN" });
    });

    it("desactivar envía `active: false`, y en una cuenta inactiva el botón activa", async () => {
        const user = userEvent.setup();
        renderWithProviders(<UsersPage />);

        await user.click(within(fila("Laura Gómez")).getByRole("button", { name: "Desactivar" }));
        expect(cambiarActivo).toHaveBeenCalledWith({ id: "u-1", active: false });

        usuarios = [usuario({ isActive: false })];
        renderWithProviders(<UsersPage />);

        const inactiva = screen.getAllByText("Laura Gómez")[1].closest("tr")!;
        await user.click(within(inactiva).getByRole("button", { name: "Activar" }));
        expect(cambiarActivo).toHaveBeenLastCalledWith({ id: "u-1", active: true });
    });

    it("una cuenta sin verificar lo dice, además de su estado", () => {
        usuarios = [usuario({ isVerified: false })];
        renderWithProviders(<UsersPage />);

        expect(within(fila("Laura Gómez")).getByText("Sin verificar")).toBeInTheDocument();
    });

    it("los filtros de rol y estado viajan a la consulta", async () => {
        const user = userEvent.setup();
        renderWithProviders(<UsersPage />);

        const [porRol, porEstado] = screen.getAllByRole("combobox");
        await user.selectOptions(porRol, "ADMIN");
        expect(consultas.at(-1)).toMatchObject({ role: "ADMIN" });

        await user.selectOptions(porEstado, "false");
        // `""` significa «todos», y por eso se traduce a `undefined` y no a `false`.
        expect(consultas.at(-1)).toMatchObject({ isActive: false });

        await user.selectOptions(porEstado, "");
        expect(consultas.at(-1)).toMatchObject({ isActive: undefined });
    });

    it("mientras carga no se pinta la tabla", () => {
        cargando = true;
        renderWithProviders(<UsersPage />);

        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("sin resultados lo dice en vez de dejar la tabla vacía", () => {
        usuarios = [];
        total = 0;
        renderWithProviders(<UsersPage />);

        expect(screen.getByText("No se encontraron usuarios.")).toBeInTheDocument();
        expect(screen.getByText("0 usuarios registrados")).toBeInTheDocument();
    });

    it("la paginación solo aparece cuando hay más de una página", async () => {
        const user = userEvent.setup();
        expect(screen.queryByRole("button", { name: "Siguiente" })).not.toBeInTheDocument();

        total = 45;
        renderWithProviders(<UsersPage />);

        expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

        await user.click(screen.getByRole("button", { name: "Siguiente" }));

        expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
        expect(consultas.at(-1)).toMatchObject({ page: 2 });
    });
});
