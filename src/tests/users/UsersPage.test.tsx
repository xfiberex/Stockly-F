import { screen, waitFor, within } from "@testing-library/react";
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
const invitar = vi.fn();
let miRol = "ADMIN";

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
    useInviteUser: () => ({ mutate: invitar, isPending: false }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: YO, name: "Admin", role: miRol } }),
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
        miRol = "ADMIN";
        usuarios = [usuario(), usuario({ id: YO, name: "Admin Principal", email: "admin@stockly.app", role: "ADMIN" })];
        total = 2;
    });

    it("lista los usuarios con su rol y su estado", () => {
        renderWithProviders(<UsersPage />);

        expect(screen.getByText("2 usuarios registrados")).toBeInTheDocument();
        // `:not(option)` porque «Consulta» y «Admin» son además las opciones del
        // selector de rol que hay en la misma fila.
        expect(within(fila("Laura Gómez")).getByText("Consulta", { selector: ":not(option)" })).toBeInTheDocument();
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

    it("AUD-012 — cambiar el rol pide confirmación, dice de cuál a cuál, y solo entonces llama a la API", async () => {
        const user = userEvent.setup();
        renderWithProviders(<UsersPage />);

        await user.selectOptions(within(fila("Laura Gómez")).getByRole("combobox"), "ADMIN");
        expect(cambiarRol).not.toHaveBeenCalled();
        const dialogo = screen.getByRole("dialog", { name: "Cambiar el rol de Laura Gómez" });
        expect(within(dialogo).getByText(/Laura Gómez pasará de Consulta a Admin/)).toBeInTheDocument();

        await user.click(within(dialogo).getByRole("button", { name: "Cambiar rol" }));
        expect(cambiarRol).toHaveBeenCalledWith({ id: "u-1", role: "ADMIN" }, expect.anything());
    });

    it("AUD-012 — con el teclado, recorrer la tabla y mover las flechas no cambia ningún rol", async () => {
        const user = userEvent.setup();
        renderWithProviders(<UsersPage />);

        // Recorrer con Tab toda la página no toca nada.
        for (let i = 0; i < 15; i++) await user.tab();
        expect(cambiarRol).not.toHaveBeenCalled();

        // Las flechas sobre el desplegable cerrado eligen otro valor, pero eso solo pregunta.
        within(fila("Laura Gómez")).getByRole("combobox").focus();
        await user.keyboard("{ArrowDown}");
        await user.keyboard("{Escape}");
        expect(cambiarRol).not.toHaveBeenCalled();
        expect(within(fila("Laura Gómez")).getByRole("combobox")).toHaveValue("USER");
    });

    it("T5-13 — ofrece el rol de almacén, lo asigna y lo pinta con su rótulo", async () => {
        usuarios = [...usuarios, usuario({ id: "u-2", name: "Mateo Rivas", email: "almacen@stockly.app", role: "WAREHOUSE" })];
        const user = userEvent.setup();
        renderWithProviders(<UsersPage />);

        expect(within(fila("Mateo Rivas")).getByText("Almacén", { selector: ":not(option)" })).toBeInTheDocument();

        await user.selectOptions(within(fila("Laura Gómez")).getByRole("combobox"), "WAREHOUSE");
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cambiar rol" }));
        expect(cambiarRol).toHaveBeenCalledWith({ id: "u-1", role: "WAREHOUSE" }, expect.anything());

        await user.selectOptions(screen.getAllByRole("combobox")[0]!, "WAREHOUSE");
        expect(consultas.at(-1)).toMatchObject({ role: "WAREHOUSE" });
    });

    it("T6-08 — ofrece el rol de vendedor, lo asigna y lo pinta con su rótulo", async () => {
        usuarios = [...usuarios, usuario({ id: "u-3", name: "Sofía Peña", email: "vendedor@stockly.app", role: "SELLER" })];
        const user = userEvent.setup();
        renderWithProviders(<UsersPage />);

        expect(within(fila("Sofía Peña")).getByText("Vendedor", { selector: ":not(option)" })).toBeInTheDocument();

        await user.selectOptions(within(fila("Laura Gómez")).getByRole("combobox"), "SELLER");
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cambiar rol" }));
        expect(cambiarRol).toHaveBeenCalledWith({ id: "u-1", role: "SELLER" }, expect.anything());

        await user.selectOptions(screen.getAllByRole("combobox")[0]!, "SELLER");
        expect(consultas.at(-1)).toMatchObject({ role: "SELLER" });
    });

    it("desactivar envía `active: false`, y en una cuenta inactiva el botón activa", async () => {
        const user = userEvent.setup();
        renderWithProviders(<UsersPage />);

        await user.click(within(fila("Laura Gómez")).getByRole("button", { name: "Desactivar" }));
        // AUD-012 — desactivar confirma; activar, abajo, no: devuelve el acceso y no quita nada.
        expect(cambiarActivo).not.toHaveBeenCalled();
        const dialogo = screen.getByRole("dialog", { name: "Desactivar a Laura Gómez" });
        expect(within(dialogo).getByText(/no podrá iniciar sesión hasta que se reactive su cuenta/)).toBeInTheDocument();
        await user.click(within(dialogo).getByRole("button", { name: "Desactivar" }));
        expect(cambiarActivo).toHaveBeenCalledWith({ id: "u-1", active: false }, expect.anything());

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

    describe("T6-10 — invitar a una persona", () => {
        const abrir = async (user: ReturnType<typeof userEvent.setup>) => {
            await user.click(screen.getByRole("button", { name: "Invitar usuario" }));
            return within(screen.getByRole("dialog", { name: "Invitar usuario" }));
        };

        it("manda nombre, correo y rol, y ninguna contraseña", async () => {
            const user = userEvent.setup();
            renderWithProviders(<UsersPage />);
            const formulario = await abrir(user);

            // El formulario no pide contraseña: la elige la persona con su enlace.
            expect(formulario.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
            expect(formulario.getByText(/enlace para elegir su contraseña/)).toBeInTheDocument();

            await user.type(formulario.getByLabelText(/Nombre/), "  Ana Pérez ");
            await user.type(formulario.getByLabelText(/Correo electrónico/), "ana@stockly.app");
            await user.selectOptions(formulario.getByLabelText("Rol"), "WAREHOUSE");
            await user.click(formulario.getByRole("button", { name: "Enviar invitación" }));

            await waitFor(() => expect(invitar).toHaveBeenCalledTimes(1));
            expect(invitar.mock.calls[0]![0]).toEqual({ name: "Ana Pérez", email: "ana@stockly.app", role: "WAREHOUSE" });
        });

        it("el rol empieza en el de menos alcance", async () => {
            const user = userEvent.setup();
            renderWithProviders(<UsersPage />);
            const formulario = await abrir(user);

            expect(formulario.getByLabelText("Rol")).toHaveValue("USER");
        });

        it("sin nombre o con un correo que no lo es no llega a pedirlo", async () => {
            const user = userEvent.setup();
            renderWithProviders(<UsersPage />);
            const formulario = await abrir(user);

            await user.type(formulario.getByLabelText(/Correo electrónico/), "no-es-correo");
            await user.click(formulario.getByRole("button", { name: "Enviar invitación" }));

            expect(await formulario.findByText("El nombre es obligatorio")).toBeInTheDocument();
            expect(formulario.getByText("Email no válido")).toBeInTheDocument();
            expect(invitar).not.toHaveBeenCalled();
        });

        it("se cierra cuando la invitación sale, y sigue abierto si falla", async () => {
            const user = userEvent.setup();
            renderWithProviders(<UsersPage />);
            let formulario = await abrir(user);

            const enviar = async () => {
                await user.type(formulario.getByLabelText(/Nombre/), "Ana");
                await user.type(formulario.getByLabelText(/Correo electrónico/), "ana@stockly.app");
                await user.click(formulario.getByRole("button", { name: "Enviar invitación" }));
                await waitFor(() => expect(invitar).toHaveBeenCalled());
            };

            // Falla (409, 503…): el hook avisa y el formulario conserva lo escrito.
            await enviar();
            expect(screen.getByRole("dialog")).toBeInTheDocument();
            expect(formulario.getByLabelText(/Nombre/)).toHaveValue("Ana");

            invitar.mockImplementation((_form, opciones: { onSuccess: () => void }) => opciones.onSuccess());
            await user.click(formulario.getByRole("button", { name: "Enviar invitación" }));
            await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

            // Y la siguiente empieza limpia.
            formulario = await abrir(user);
            expect(formulario.getByLabelText(/Nombre/)).toHaveValue("");
        });

        it("quien no puede llamar a `POST /users` no ve el botón", () => {
            miRol = "WAREHOUSE";
            renderWithProviders(<UsersPage />);

            expect(screen.queryByRole("button", { name: "Invitar usuario" })).not.toBeInTheDocument();
        });

        it("no se puede invitar a alguien sin rol (AUD-001)", async () => {
            const user = userEvent.setup();
            renderWithProviders(<UsersPage />);
            const formulario = await abrir(user);

            const valores = Array.from(formulario.getByLabelText("Rol").querySelectorAll("option")).map((o) => o.value);
            expect(valores).toEqual(["ADMIN", "USER", "WAREHOUSE", "SELLER"]);
        });
    });

    describe("AUD-001 — aprobar una cuenta pendiente", () => {
        beforeEach(() => {
            usuarios = [...usuarios, usuario({ id: "u-p", name: "Diego Castro", email: "pendiente@stockly.app", role: "PENDING" })];
            total = 3;
        });

        it("la fila dice que está pendiente, con icono, y su selector empieza en «Aprobar como…»", () => {
            renderWithProviders(<UsersPage />);

            const suya = within(fila("Diego Castro"));
            const insignia = suya.getByText("Pendiente", { selector: ":not(option)" });
            expect(insignia.querySelector("svg")).not.toBeNull();
            const selector = suya.getByRole("combobox", { name: "Aprobar a Diego Castro con un rol" });
            expect(selector).toHaveValue("");
            expect(within(selector).getByRole("option", { name: "Aprobar como…" })).toBeInTheDocument();
        });

        it("elegir un rol la aprueba con ese rol, y el aviso lleva su nombre", async () => {
            const user = userEvent.setup();
            renderWithProviders(<UsersPage />);

            await user.selectOptions(within(fila("Diego Castro")).getByRole("combobox"), "WAREHOUSE");
            // AUD-012 — aprobar también confirma: dice con qué rol entrará.
            expect(cambiarRol).not.toHaveBeenCalled();
            const dialogo = screen.getByRole("dialog", { name: "Aprobar a Diego Castro" });
            expect(within(dialogo).getByText("Diego Castro podrá entrar en Stockly con el rol Almacén.")).toBeInTheDocument();
            await user.click(within(dialogo).getByRole("button", { name: "Aprobar" }));

            expect(cambiarRol).toHaveBeenCalledWith({ id: "u-p", role: "WAREHOUSE", aprobando: "Diego Castro" }, expect.anything());
        });

        it("ningún selector de la tabla ofrece «Pendiente»: no se le quita el rol a nadie", () => {
            renderWithProviders(<UsersPage />);

            for (const nombre of ["Laura Gómez", "Diego Castro"]) {
                const valores = Array.from(within(fila(nombre)).getByRole("combobox").querySelectorAll("option")).map((o) => o.value);
                expect(valores).not.toContain("PENDING");
            }
        });

        it("el filtro de rol ofrece las pendientes", async () => {
            const user = userEvent.setup();
            renderWithProviders(<UsersPage />);

            await user.selectOptions(screen.getByRole("combobox", { name: "Todos los roles" }), "PENDING");

            expect(consultas.at(-1)).toMatchObject({ role: "PENDING" });
        });

        it("el aviso de la campana trae con `?role=PENDING` y la lista ya sale filtrada", () => {
            renderWithProviders(<UsersPage />, { initialRoute: "/admin/users?role=PENDING" });

            expect(consultas.at(-1)).toMatchObject({ role: "PENDING" });
            expect(screen.getByRole("combobox", { name: "Todos los roles" })).toHaveValue("PENDING");
        });

        it("un `?role=` que no es un rol se ignora en vez de pedirlo", () => {
            renderWithProviders(<UsersPage />, { initialRoute: "/admin/users?role=NADA" });

            expect(consultas.at(-1)).toMatchObject({ role: undefined });
        });
    });
});
