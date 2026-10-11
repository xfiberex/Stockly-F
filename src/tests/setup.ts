import "@testing-library/jest-dom";

// jsdom no implementa el desplazamiento de la ventana: cada llamada real escupe
// «Not implemented: Window's scrollTo() method» por la salida de los tests. La
// aplicación lo usa en cada cambio de ruta (`AnuncioDeRuta`), así que sin este relevo
// el ruido tapaba los avisos que sí importan. Es un espía sustituible: quien quiera
// comprobar *que se llamó* hace su propio `vi.spyOn(window, "scrollTo")` encima.
window.scrollTo = () => {};

/**
 * T4-04 — el idioma del entorno de test se fija en español.
 *
 * jsdom se declara `en-US`, así que sin esto la preferencia «auto» resolvía a inglés y **las
 * 471 aserciones sobre texto en español pasaban a fallar a la vez**. No es un apaño para que
 * pasen: es que la suite comprueba *una* interfaz concreta, y cuál sea no puede depender de la
 * máquina que la ejecute. Lo mismo hace `playwright.config.ts` con `locale: "es-ES"`.
 *
 * Que el inglés funciona lo comprueban los tests de `src/tests/i18n/`, que eligen el idioma
 * explícitamente en vez de heredarlo del entorno.
 */
Object.defineProperty(navigator, "languages", { value: ["es-ES", "es"], configurable: true });
Object.defineProperty(navigator, "language", { value: "es-ES", configurable: true });

/**
 * T5-14 — por defecto, los tests corren con **un solo almacén**, el predeterminado.
 *
 * Casi todas las pantallas preguntan ya cuántos almacenes hay, y con uno solo se pintan como
 * antes de que existieran: ni selectores ni columnas. Sin este doble, cada test que montara una
 * de esas pantallas intentaría pedir `/warehouses` a un servidor que no existe. El test que
 * quiera varios almacenes sustituye este módulo con su propio `vi.mock`.
 */
vi.mock("@/modules/warehouses/api/warehouses.api", () => ({
    getWarehouses: vi.fn().mockResolvedValue([
        {
            id: "almacen-1", name: "Principal", address: null, isDefault: true, isActive: true,
            createdAt: "2026-10-10T10:00:00.000Z", updatedAt: "2026-10-10T10:00:00.000Z",
        },
    ]),
    getWarehousesSummary: vi.fn().mockResolvedValue([]),
    createWarehouse: vi.fn(),
    updateWarehouse: vi.fn(),
    setDefaultWarehouse: vi.fn(),
    setWarehouseActive: vi.fn(),
}));
