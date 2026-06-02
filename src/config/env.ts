// Configuración de variables de entorno para la aplicación
const apiUrl = import.meta.env.VITE_API_URL;

// Validar que la variable de entorno esté definida
if (!apiUrl) {
    throw new Error("La variable de entorno VITE_API_URL no está definida.");
}

// Exportar las variables de entorno como un objeto constante
export const env = {
    API_URL: apiUrl as string,
} as const;