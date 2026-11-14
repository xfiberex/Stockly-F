import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { renderWithProviders } from "@/tests/utils";
import AuditLogsPage from "@/modules/audit-logs/components/AuditLogsPage";
import type { AuditLog, AuditLogsQuery } from "@/modules/audit-logs/types/audit-logs.types";

/**
 * AUD-017 — la bitácora dice a quién o a qué afectó cada fila, se filtra por usuario y por días
 * desde la URL, enseña los detalles traducidos y distingue un fallo de una lista vacía.
 */

const FILA = (extra: Partial<AuditLog>): AuditLog => ({
    id: Math.random().toString(36).slice(2),
    userId: "u-admin",
    userEmail: "admin@stockly.app",
    action: "UPDATE",
    entity: "Product",
    entityId: "p-1",
    entityLabel: null,
    entityExists: false,
    details: null,
    createdAt: "2026-10-05T15:00:00.000Z",
    ...extra,
});

const FILAS: AuditLog[] = [
    FILA({ entity: "Product", entityId: "p-1", entityLabel: "Teclado Logitech", entityExists: true }),
    FILA({ action: "USER_ROLE_CHANGE", entity: "User", entityId: "u-ana", entityLabel: "Ana Pérez", entityExists: true, details: { email: "ana@stockly.app", de: "PENDING", a: "WAREHOUSE", aprobada: true } }),
    FILA({ action: "SALE_SHIP", entity: "SaleOrder", entityId: "v-1", entityLabel: "000042", entityExists: true }),
    FILA({ action: "DELETE", entity: "Customer", entityId: "c-1", entityLabel: "Ferretería López", entityExists: false, details: { label: "Ferretería López" } }),
    FILA({ action: "BULK_STOCK", entity: "Product", entityId: null, details: { items: 3, reason: "Inventario anual" } }),
    FILA({ action: "CREATE", entity: "Product", entityId: "p-2", entityLabel: "Monitor LG", entityExists: true, details: { name: "Monitor LG", sku: "MON-LG" } }),
    FILA({ entity: "Product", entityId: "p-3", entityLabel: "Televisor", entityExists: true, details: { price: { de: 22990, a: 24999 } } }),
];

let estado: { data?: { data: AuditLog[]; meta: { total: number; page: number; limit: number; totalPages: number } }; error: unknown; errorUpdateCount: number };
const consultas: AuditLogsQuery[] = [];
const refetch = vi.fn();
const exportar = vi.fn();

const con = (filas: AuditLog[]) => ({ data: { data: filas, meta: { total: filas.length, page: 1, limit: 50, totalPages: 1 } }, error: null, errorUpdateCount: 0 });

vi.mock("@/modules/audit-logs/hooks/useAuditLogs", () => ({
    useAuditLogs: (q: AuditLogsQuery) => {
        consultas.push(q);
        return { ...estado, isLoading: false, isFetching: false, refetch };
    },
    useAuditActors: () => ({
        data: [
            { userId: "u-admin", name: "Admin Principal", email: "admin@stockly.app" },
            { userId: "u-se-fue", name: null, email: "se_fue@stockly.app" },
        ],
    }),
}));
vi.mock("@/modules/audit-logs/api/audit-logs.api", () => ({
    exportAuditLogsCsv: (...args: unknown[]) => exportar(...args),
}));

const ultima = () => consultas[consultas.length - 1]!;

beforeEach(() => {
    estado = con(FILAS);
    consultas.length = 0;
    refetch.mockClear();
    exportar.mockClear();
});

describe("Bitácora (AUD-017)", () => {
    it("cada fila dice a quién o a qué afectó, enlazado si todavía existe", () => {
        renderWithProviders(<AuditLogsPage />);

        expect(screen.getByRole("link", { name: "Teclado Logitech" })).toHaveAttribute("href", "/catalog/products/p-1/movements");
        expect(screen.getByRole("link", { name: "Ana Pérez" })).toHaveAttribute("href", "/admin/users?buscar=Ana%20P%C3%A9rez");
        // La venta, con su número y abierta en su lista.
        expect(screen.getByRole("link", { name: "#000042" })).toHaveAttribute("href", "/sale-orders?numero=42&venta=v-1");
        // Lo borrado se nombra, pero no se enlaza: no hay adónde ir.
        expect(screen.getByText("Ferretería López")).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Ferretería López" })).not.toBeInTheDocument();
        // Ya no hay ids recortados donde hay nombre.
        expect(screen.queryByText(/#p-1/)).not.toBeInTheDocument();
    });

    it("los detalles son pares traducidos, no JSON; la etiqueta guardada no se repite", () => {
        renderWithProviders(<AuditLogsPage />);

        const rol = screen.getByRole("link", { name: "Ana Pérez" }).closest("tr")!;
        expect(within(rol).getByText("Rol anterior").nextElementSibling).toHaveTextContent("Pendiente");
        expect(within(rol).getByText("Rol nuevo").nextElementSibling).toHaveTextContent("Almacén");
        expect(within(rol).getByText("Cuenta aprobada").nextElementSibling).toHaveTextContent("Sí");

        const borrado = screen.getByText("Ferretería López").closest("tr")!;
        expect(within(borrado).queryByText("label")).not.toBeInTheDocument();

        expect(screen.getByText("Motivo").nextElementSibling).toHaveTextContent("Inventario anual");
        // Un cambio se lee «antes → después», con el formato de la moneda.
        expect(screen.getByText("Precio").nextElementSibling).toHaveTextContent("$22,990.00 → $24,999.00");
        // El nombre que ya sale en la columna de la entidad no se repite en los detalles.
        const creado = screen.getByRole("link", { name: "Monitor LG" }).closest("tr")!;
        expect(within(creado).queryByText("Nombre")).not.toBeInTheDocument();
        expect(within(creado).getByText("SKU").nextElementSibling).toHaveTextContent("MON-LG");
        expect(document.body.textContent).not.toContain("{\"");
    });

    it("filtrar por un usuario y un día pide solo eso, y los filtros salen de la URL", async () => {
        const user = userEvent.setup();
        renderWithProviders(<AuditLogsPage />, { initialRoute: "/audit-logs?desde=2026-10-05&hasta=2026-10-05" });

        expect(ultima()).toMatchObject({ from: "2026-10-05", to: "2026-10-05", page: 1 });

        await user.selectOptions(screen.getByRole("combobox", { name: "Filtrar por usuario" }), "u-admin");

        expect(ultima()).toMatchObject({ userId: "u-admin", from: "2026-10-05", to: "2026-10-05", page: 1 });
        // La cuenta que ya no existe se ofrece por su correo.
        expect(screen.getByRole("option", { name: "se_fue@stockly.app" })).toBeInTheDocument();
    });

    it("un rango al revés no se pide y lo dice", () => {
        renderWithProviders(<AuditLogsPage />, { initialRoute: "/audit-logs?desde=2026-10-06&hasta=2026-10-05" });

        expect(ultima()).toMatchObject({ from: undefined, to: undefined });
        expect(screen.getByText("La fecha final no puede ser anterior a la inicial")).toBeInTheDocument();
    });

    it("exporta lo que se está viendo, con sus filtros", async () => {
        const user = userEvent.setup();
        renderWithProviders(<AuditLogsPage />, { initialRoute: "/audit-logs?usuario=u-admin&accion=DELETE" });

        await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

        expect(exportar).toHaveBeenCalledWith(expect.objectContaining({ userId: "u-admin", action: "DELETE" }));
    });

    it("sin resultados con filtros, lo dice y deja quitarlos", async () => {
        estado = con([]);
        const user = userEvent.setup();
        renderWithProviders(<AuditLogsPage />, { initialRoute: "/audit-logs?accion=DELETE" });

        expect(screen.getByText("Ningún registro cumple estos filtros.")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Quitar filtros" }));

        expect(ultima()).toMatchObject({ action: undefined });
    });

    it("si falla la carga lo dice y deja reintentar; no se lee como una lista vacía", async () => {
        estado = { data: undefined, error: new AxiosError("Network Error", "ERR_NETWORK"), errorUpdateCount: 1 };
        const user = userEvent.setup();
        renderWithProviders(<AuditLogsPage />);

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la auditoría");
        expect(screen.queryByText("No hay registros de auditoría.")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Reintentar" }));

        expect(refetch).toHaveBeenCalledTimes(1);
    });
});
