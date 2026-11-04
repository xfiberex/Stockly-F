import { waitFor } from "@testing-library/react";
import { useRoutes } from "react-router-dom";
import { renderWithProviders } from "@/tests/utils";
import { router } from "@/routes";

// Las pantallas de acceso no pasan por `App`, que es donde vive `AnuncioDeRuta`. Al cerrar
// sesión, el login heredaba el título de la última pantalla —«Dashboard · Stockly»— porque
// nadie lo reescribía. Se prueba con las rutas de verdad del router, no con un layout de
// prueba: lo que fallaba era justo que estas no montaban el anuncio.

const deAcceso = router.routes.filter((ruta) => ruta.path === "/auth");

function RutasDeAcceso() {
    return useRoutes(deAcceso);
}

describe("Título de las pantallas de acceso", () => {
    it.each([
        ["/auth/login", "Iniciar sesión · Stockly"],
        ["/auth/forgot-password", "Recuperar contraseña · Stockly"],
    ])("%s pone su título aunque la pestaña trajera el de otra pantalla", async (ruta, titulo) => {
        document.title = "Dashboard · Stockly";

        renderWithProviders(<RutasDeAcceso />, { initialRoute: ruta });

        await waitFor(() => expect(document.title).toBe(titulo));
    });
});
