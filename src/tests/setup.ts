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
