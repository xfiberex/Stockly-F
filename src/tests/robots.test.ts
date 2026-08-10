import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * T3-12 — la aplicación no debe indexarse, y eso se declara en dos sitios.
 *
 * Comprobado además contra el build real: sirviendo `dist/` como lo hace nginx,
 * `GET /robots.txt` devuelve **200 text/plain** con el archivo, mientras que una ruta de
 * la aplicación cae al `index.html` de la SPA. Ese es el criterio de aceptación, y no se
 * puede reproducir desde aquí porque exige compilar; este test cubre lo otro: que los dos
 * archivos de origen sigan diciendo lo que deben.
 */

const RAIZ = process.cwd();

describe("Declaración de no indexación (T3-12)", () => {
    it("`public/robots.txt` prohíbe el rastreo completo", () => {
        const robots = readFileSync(path.join(RAIZ, "public", "robots.txt"), "utf8");

        // Se comparan las líneas sin comentarios: el archivo lleva una explicación larga
        // arriba y no debe romper el test al reescribirla.
        const directivas = robots
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith("#"));

        expect(directivas).toEqual(["User-agent: *", "Disallow: /"]);
    });

    it("`index.html` lleva además el `noindex`", () => {
        // No es redundante: `Disallow` impide **rastrear**, no **indexar**. Un buscador
        // que reciba un enlace a esta URL puede listarla igualmente, sin descripción,
        // porque no puede entrar a comprobar que no debe. La etiqueta sí lo prohíbe, y se
        // lee en el caso en que el `robots.txt` de la raíz no sea de esta aplicación.
        const html = readFileSync(path.join(RAIZ, "index.html"), "utf8");

        expect(html).toMatch(/<meta\s+name="robots"\s+content="noindex, nofollow"/);
    });
});
