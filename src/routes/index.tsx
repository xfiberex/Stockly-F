import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "@/App";
import DashboardPage from "@/modules/dashboard/components/DashboardPage";
import ProductsPage from "@/modules/products/components/ProductsPage";
import StockMovementsPage from "@/modules/products/components/StockMovementsPage";
import ProfilePage from "@/modules/auth/components/ProfilePage";
import CatalogPage from "@/modules/catalog/components/CatalogPage";
import CategoriesPage from "@/modules/catalog/components/CategoriesPage";
import BrandsPage from "@/modules/catalog/components/BrandsPage";
import SuppliersPage from "@/modules/suppliers/components/SuppliersPage";
import NotFoundPage from "@/shared/components/NotFoundPage";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import LoginPage from "@/modules/auth/components/LoginPage";
import RegisterPage from "@/modules/auth/components/RegisterPage";
import ForgotPasswordPage from "@/modules/auth/components/ForgotPasswordPage";
import ResetPasswordPage from "@/modules/auth/components/ResetPasswordPage";
import VerifyEmailPage from "@/modules/auth/components/VerifyEmailPage";
import ResendVerificationPage from "@/modules/auth/components/ResendVerificationPage";

export const router = createBrowserRouter([
    {
        path: "/auth",
        children: [
            { path: "login", element: <LoginPage /> },
            { path: "register", element: <RegisterPage /> },
            { path: "forgot-password", element: <ForgotPasswordPage /> },
            { path: "reset-password", element: <ResetPasswordPage /> },
            { path: "confirm-account", element: <VerifyEmailPage /> },
            { path: "resend-verification", element: <ResendVerificationPage /> },
            { index: true, element: <Navigate to="/auth/login" replace /> },
        ],
    },
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <App />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <DashboardPage /> },
            { path: "profile", element: <ProfilePage /> },
            {
                path: "catalog",
                element: <CatalogPage />,
                children: [
                    { index: true, element: <Navigate to="/catalog/products" replace /> },
                    { path: "products", element: <ProductsPage /> },
                    { path: "products/:id/movements", element: <StockMovementsPage /> },
                    { path: "categories", element: <CategoriesPage /> },
                    { path: "brands", element: <BrandsPage /> },
                    { path: "suppliers", element: <SuppliersPage /> },
                ],
            },
            { path: "*", element: <NotFoundPage /> },
        ],
    },
    {
        path: "*",
        element: <NotFoundPage />,
    },
]);
