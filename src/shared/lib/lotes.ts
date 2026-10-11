import type { BadgeVariant } from "@/shared/components/Badge";
import type { Traductor } from "@/shared/hooks/useIdioma";

/**
 * T5-15 — lo que la interfaz dice de una fecha de caducidad.
 *
 * `daysLeft` lo calcula **el servidor**, en la zona del negocio: aquí no se resta ninguna fecha.
 * Con el reloj del navegador, quien mira desde otra zona vería caducado lo que en la tienda
 * todavía se vende.
 */

/** «Caducó hace 3 días», «Caduca hoy», «Caduca en 12 días». */
export function cuandoCaduca({ t, tn }: Pick<Traductor, "t" | "tn">, daysLeft: number): string {
    if (daysLeft < 0) return tn("lotes.caducoHace", -daysLeft);
    if (daysLeft === 0) return t("lotes.caducaHoy");
    return tn("lotes.caducaEn", daysLeft);
}

/** A partir de cuántos días se pinta como urgente. No es el plazo de aviso: es solo el color. */
const DIAS_DE_URGENCIA = 7;

/** El color acompaña al texto, que ya lo dice (WCAG 1.4.1): rojo lo caducado, ámbar lo inminente. */
export function tonoDeCaducidad(daysLeft: number): BadgeVariant {
    if (daysLeft < 0) return "danger";
    return daysLeft <= DIAS_DE_URGENCIA ? "warning" : "neutral";
}
