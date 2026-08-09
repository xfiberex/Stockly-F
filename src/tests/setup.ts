import "@testing-library/jest-dom";

// jsdom no implementa el desplazamiento de la ventana: cada llamada real escupe
// «Not implemented: Window's scrollTo() method» por la salida de los tests. La
// aplicación lo usa en cada cambio de ruta (`AnuncioDeRuta`), así que sin este relevo
// el ruido tapaba los avisos que sí importan. Es un espía sustituible: quien quiera
// comprobar *que se llamó* hace su propio `vi.spyOn(window, "scrollTo")` encima.
window.scrollTo = () => {};
