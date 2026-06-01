import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "@/App";
import NotFoundPage from "@/shared/components/NotFoundPage";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { Spinner } from "@/shared/components/Spinner";

const LoginPage = lazy(() => import("@/modules/auth/components/LoginPage"));
const RegisterPage = lazy(() => import("@/modules/auth/components/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/modules/auth/components/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/modules/auth/components/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/modules/auth/components/VerifyEmailPage"));
const ResendVerificationPage = lazy(() => import("@/modules/auth/components/ResendVerificationPage"));

const DashboardPage = lazy(() => import("@/modules/dashboard/components/DashboardPage"));
const ProfilePage = lazy(() => import("@/modules/auth/components/ProfilePage"));
const ReportsPage = lazy(() => import("@/modules/reports/components/ReportsPage"));
const PurchaseOrdersPage = lazy(() => import("@/modules/purchase-orders/components/PurchaseOrdersPage"));
const SaleOrdersPage = lazy(() => import("@/modules/sale-orders/components/SaleOrdersPage"));
const AuditLogsPage = lazy(() => import("@/modules/audit-logs/components/AuditLogsPage"));
const SettingsPage = lazy(() => import("@/modules/settings/components/SettingsPage"));
const UsersPage = lazy(() => import("@/modules/users/components/UsersPage"));

const CatalogPage = lazy(() => import("@/modules/catalog/components/CatalogPage"));
const ProductsPage = lazy(() => import("@/modules/products/components/ProductsPage"));
const StockMovementsPage = lazy(() => import("@/modules/products/components/StockMovementsPage"));
const CategoriesPage = lazy(() => import("@/modules/catalog/components/CategoriesPage"));
const BrandsPage = lazy(() => import("@/modules/catalog/components/BrandsPage"));
const SuppliersPage = lazy(() => import("@/modules/suppliers/components/SuppliersPage"));
const TagsPage = lazy(() => import("@/modules/tags/components/TagsPage"));

function PageLoader() {
    return (
        <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
        </div>
    );
}

function S({ children }: { children: ReactNode }) {
    return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
    {
        path: "/auth",
        children: [
            { path: "login", element: <S><LoginPage /></S> },
            { path: "register", element: <S><RegisterPage /></S> },
            { path: "forgot-password", element: <S><ForgotPasswordPage /></S> },
            { path: "reset-password", element: <S><ResetPasswordPage /></S> },
            { path: "confirm-account", element: <S><VerifyEmailPage /></S> },
            { path: "resend-verification", element: <S><ResendVerificationPage /></S> },
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
            { index: true, element: <S><DashboardPage /></S> },
            { path: "profile", element: <S><ProfilePage /></S> },
            { path: "reports", element: <S><ReportsPage /></S> },
            { path: "purchase-orders", element: <S><PurchaseOrdersPage /></S> },
            { path: "sale-orders", element: <S><SaleOrdersPage /></S> },
            { path: "audit-logs", element: <S><AuditLogsPage /></S> },
            { path: "settings", element: <S><SettingsPage /></S> },
            {
                path: "admin",
                children: [
                    { path: "users", element: <S><UsersPage /></S> },
                ],
            },
            {
                path: "catalog",
                element: <S><CatalogPage /></S>,
                children: [
                    { index: true, element: <Navigate to="/catalog/products" replace /> },
                    { path: "products", element: <S><ProductsPage /></S> },
                    { path: "products/:id/movements", element: <S><StockMovementsPage /></S> },
                    { path: "categories", element: <S><CategoriesPage /></S> },
                    { path: "brands", element: <S><BrandsPage /></S> },
                    { path: "suppliers", element: <S><SuppliersPage /></S> },
                    { path: "tags", element: <S><TagsPage /></S> },
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
