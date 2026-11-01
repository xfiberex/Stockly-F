import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "react-toastify";
import { useSetUserActive, useUpdateUserRole } from "@/modules/users/hooks/useUsers";
import { activateUser, deactivateUser, updateUserRole } from "@/modules/users/api/users.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { createTestQueryClient } from "@/tests/utils";

/**
 * AUD-001 — aprobar una cuenta es dar su primer rol, y el servidor retira entonces su aviso de
 * todas las campanas. Lo que hace el hook además de cambiar el rol: decir «Cuenta aprobada» y
 * que la campana de quien aprueba se ponga al día en el acto, no al minuto siguiente.
 */

vi.mock("@/modules/users/api/users.api", () => ({
    getUsers: vi.fn(),
    inviteUser: vi.fn(),
    updateUserRole: vi.fn().mockResolvedValue({}),
    activateUser: vi.fn().mockResolvedValue({}),
    deactivateUser: vi.fn().mockResolvedValue({}),
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function montar<T>(hook: () => T) {
    const client = createTestQueryClient();
    const invalidadas = vi.spyOn(client, "invalidateQueries");
    const envoltorio = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(hook, { wrapper: envoltorio });
    const claves = () => invalidadas.mock.calls.map(([filtro]) => filtro?.queryKey);
    return { result, claves };
}

beforeEach(() => vi.clearAllMocks());

describe("Aprobar una cuenta pendiente (AUD-001)", () => {
    it("al aprobar, lo dice con el nombre y refresca la campana", async () => {
        const { result, claves } = montar(() => useUpdateUserRole());

        await act(() => result.current.mutateAsync({ id: "u-p", role: "WAREHOUSE", aprobando: "Diego Castro" }));

        expect(updateUserRole).toHaveBeenCalledWith("u-p", "WAREHOUSE");
        expect(toast.success).toHaveBeenCalledWith("Cuenta aprobada: Diego Castro ya puede entrar");
        expect(claves()).toContainEqual(queryKeys.notifications);
    });

    it("un cambio de rol corriente sigue diciendo «Rol actualizado» y no toca la campana", async () => {
        const { result, claves } = montar(() => useUpdateUserRole());

        await act(() => result.current.mutateAsync({ id: "u-1", role: "SELLER" }));

        expect(toast.success).toHaveBeenCalledWith("Rol actualizado");
        expect(claves()).not.toContainEqual(queryKeys.notifications);
    });

    it("desactivar refresca la campana: si era una cuenta pendiente, su aviso ya no está", async () => {
        const { result, claves } = montar(() => useSetUserActive());

        await act(() => result.current.mutateAsync({ id: "u-p", active: false }));

        expect(deactivateUser).toHaveBeenCalledWith("u-p");
        expect(activateUser).not.toHaveBeenCalled();
        expect(claves()).toContainEqual(queryKeys.notifications);
    });
});
