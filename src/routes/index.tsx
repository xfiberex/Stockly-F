import { createBrowserRouter } from "react-router-dom";
import App from "@/App";
import DashboardPage from "@/pages/DashboardPage";
import ProductsPage from "@/pages/ProductsPage";
import NotFoundPage from "@/pages/NotFoundPage";

// Configuración de rutas utilizando React Router
export const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            { index: true, element: <DashboardPage /> },
            { path: "products", element: <ProductsPage /> },
            { path: "*", element: <NotFoundPage /> },
        ],
    },
    {
        path: "*",
        element: <NotFoundPage />,
    }
]);