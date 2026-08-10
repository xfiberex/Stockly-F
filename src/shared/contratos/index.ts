/**
 * T4-01 — Punto de entrada al contrato de la API.
 *
 * La aplicación importa siempre de aquí, nunca de `api.generated.ts`: así el hecho de que
 * el contrato llegue copiado del backend es un detalle de este directorio y no algo que
 * aparezca en cien imports.
 *
 * **La fuente de verdad vive en `Stockly-B/src/contratos/api.ts`.** Para cambiar la forma
 * de una respuesta se edita allí y se ejecuta `pnpm contratos:generar` en el backend, que
 * reescribe `api.generated.ts`. Si la copia se queda atrás, `frescura.test.ts` pone
 * `pnpm verify` en rojo; si el cambio quita o renombra un campo, lo señala `tsc` en cada
 * sitio que lo usaba.
 *
 * Los tipos de cada módulo (`Product`, `SaleOrder`, …) son alias en castellano-inglés de
 * los de aquí: se conservan sus nombres para no reescribir la aplicación entera, pero ya
 * no los declara nadie a mano.
 */

export * from "./api.generated";
