import type { SettingEntry } from "@/modules/settings/types/settings.types";
import type { Product } from "@/modules/products/types/product.types";
import type { SaleOrder } from "@/modules/sale-orders/types/sale-orders.types";
import { ajusteSchema, productoSchema, ordenDeVentaSchema, segunContrato } from "./esquemas";

/**
 * T2-24 — mocks compartidos, **validados contra el contrato al importarlos**.
 *
 * La validación corre al cargar el módulo, no dentro de un `it`. Es deliberado: así
 * cualquier test que use uno de estos objetos falla si el mock deja de parecerse a lo
 * que devuelve el backend, sin depender de que alguien se acuerde de comprobarlo.
 * Un test de contrato que hay que invocar a mano es un test que se olvida.
 *
 * T4-01 retiró los `as unknown as …` que llevaban estas tres constantes. Eran el agujero
 * del mecanismo: acallaban al compilador, así que a los mocks les faltaban campos que el
 * backend sí envía —`imagePublicId`, los `*Id` sueltos, el `product` de cada ítem— y la
 * validación en tiempo de ejecución no lo veía porque Zod ignora las claves de más, no
 * las de menos. Ahora el tipo y el esquema tienen que cuadrar los dos.
 */

export const ajusteBooleano: SettingEntry = segunContrato(ajusteSchema, {
    key: "lowStockAlertEnabled",
    label: "Alertas de bajo stock por correo",
    description: "Envía un correo a los administradores cuando el stock cae por debajo del mínimo.",
    type: "boolean",
    // Boolean, no la cadena "false": el backend lo convierte según el `type` del
    // catálogo antes de responder. Mockearlo como cadena ocultó T1-06.
    value: false,
}, "ajusteBooleano");

export const productoDeCatalogo: Product = segunContrato(productoSchema, {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Monitor LG UltraGear",
    description: "27 pulgadas, 144 Hz",
    sku: "PER-LG-UG27",
    // Cadena, no número: `price` es `Decimal` en Prisma y viaja serializado.
    price: "299.99",
    stock: 12,
    minStock: 3,
    imageUrl: null,
    imagePublicId: null,
    isActive: true,
    categoryId: "22222222-2222-2222-2222-222222222222",
    brandId: null,
    supplierId: null,
    category: { id: "22222222-2222-2222-2222-222222222222", name: "Periféricos" },
    brand: null,
    supplier: null,
    // Array de objetos, no de cadenas: es la forma que el validador descartaba en
    // silencio y que costó T1-03.
    tags: [{ id: "33333333-3333-3333-3333-333333333333", name: "Oferta", color: "#ef4444" }],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
}, "productoDeCatalogo");

export const ordenDeVentaEnviada: SaleOrder = segunContrato(ordenDeVentaSchema, {
    id: "aaaaaaaa-1111-2222-3333-444444444444",
    status: "SHIPPED",
    customerName: "Cliente de prueba",
    customerEmail: null,
    customerPhone: null,
    notes: null,
    items: [
        {
            id: "i1",
            saleOrderId: "aaaaaaaa-1111-2222-3333-444444444444",
            productId: "p1",
            product: { id: "p1", name: "Teclado", sku: "PER-TEC" },
            productName: "Teclado",
            quantity: 3,
            unitPrice: "50.00",
            createdAt: "2026-08-08T10:00:00.000Z",
        },
        // Ítem suelto: `productId` **y** `product` en null. De esa distinción depende el
        // recuento de reposición de T2-42, que excluye los ítems sin producto.
        {
            id: "i2",
            saleOrderId: "aaaaaaaa-1111-2222-3333-444444444444",
            productId: null,
            product: null,
            productName: "Servicio de instalación",
            quantity: 1,
            unitPrice: "25.00",
            createdAt: "2026-08-08T10:00:00.000Z",
        },
    ],
    createdAt: "2026-08-08T10:00:00.000Z",
    updatedAt: "2026-08-08T10:00:00.000Z",
}, "ordenDeVentaEnviada");
