import { useState } from "react";
import { z } from "zod";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { cn } from "@/shared/lib/cn";
import { Spinner } from "@/shared/components/Spinner";
import { SelectorDeIdioma } from "@/modules/settings/components/SelectorDeIdioma";
import { SelectorDeTema } from "@/modules/settings/components/SelectorDeTema";
import { LogoDelNegocio } from "@/modules/settings/components/LogoDelNegocio";
import { useT } from "@/shared/hooks/useIdioma";
import { existeClave, type Clave } from "@/shared/i18n/traducir";
import { TASA_DE_IMPUESTO_MAXIMA, esTasaDeImpuestoValida, motivoSimboloDeMonedaInvalido } from "@/shared/contratos";
import { useSettings, useUpdateSettings } from "@/modules/settings/hooks/useSettings";
import type { SettingEntry, SettingUpdates, SettingValue } from "@/modules/settings/types/settings.types";

// El backend envía los booleanos ya parseados, pero un valor tecleado en un input
// llega como cadena. Se aceptan ambas formas para no depender de por dónde vino.
function esVerdadero(value: SettingValue): boolean {
    return value === true || value === "true";
}

/** El texto de un ajuste: el del catálogo si existe, y si no el que manda la API. */
function textoDeAjuste(
    t: (clave: Clave) => string,
    key: string,
    parte: "titulo" | "descripcion",
    respaldo: string,
): string {
    const clave = `ajuste.${key}.${parte}`;
    return existeClave(clave) ? t(clave) : respaldo;
}

/**
 * T5-09 — las zonas horarias que conoce el navegador, para no escribir un nombre IANA a mano:
 * un error de tecleo lo rechazaría el backend, pero con una lista no llega a haberlo. La zona
 * guardada se añade si el navegador no la lista —`UTC`, por ejemplo, no sale en todos—, o el
 * desplegable enseñaría otra distinta de la que está en vigor.
 */
function opcionesDeZona(guardada: string) {
    const zonas = Intl.supportedValuesOf("timeZone");
    if (!zonas.includes(guardada)) zonas.unshift(guardada);
    return zonas.map((zona) => ({ value: zona, label: zona.replaceAll("_", " ") }));
}

/** Los `id` del título y la descripción de un ajuste: de ahí saca su nombre el control. */
function rotulosDe(key: string) {
    return { "aria-labelledby": `ajuste-${key}-titulo`, "aria-describedby": `ajuste-${key}-descripcion` };
}

/** T6-03 — el mensaje de cada motivo por el que el contrato rechaza un símbolo de moneda. */
const ERROR_DE_SIMBOLO = {
    largo: "configuracion.moneda.largo",
    caracteres: "configuracion.moneda.caracteres",
} as const satisfies Record<NonNullable<ReturnType<typeof motivoSimboloDeMonedaInvalido>>, Clave>;

/**
 * T6-03 — por qué no se puede guardar `valor` en ese ajuste, o `null` si se puede.
 *
 * El servidor valida igual y responde 422, pero sus mensajes de campo van en español y sin
 * código: lo que el formulario puede decir antes, lo dice él y en el idioma de quien mira. El
 * símbolo usa **la misma función** que el backend, no una copia de su regla.
 */
function errorDeAjuste(key: string, valor: SettingValue): Clave | null {
    if (key === "currencySymbol") {
        const motivo = motivoSimboloDeMonedaInvalido(String(valor));
        return motivo && ERROR_DE_SIMBOLO[motivo];
    }
    if (key === "businessEmail") {
        const correo = String(valor).trim();
        return correo === "" || z.email().safeParse(correo).success ? null : "configuracion.correoInvalido";
    }
    // T6-05 — la tasa, con la misma función que el `PATCH`.
    if (key === "taxRate") return esTasaDeImpuestoValida(Number(valor)) ? null : "configuracion.impuestoInvalido";
    return null;
}

/** El teclado que saca un móvil para cada dato del negocio. */
const TECLADO: Record<string, "email" | "tel"> = { businessEmail: "email", businessPhone: "tel" };

function BooleanToggle({ value, onChange, ...rotulos }: {
    value: SettingValue;
    onChange: (value: boolean) => void;
    "aria-labelledby": string;
    "aria-describedby": string;
}) {
    const isOn = esVerdadero(value);
    return (
        <button
            type="button"
            role="switch"
            aria-checked={isOn}
            // T5-11 — sin esto el interruptor no tenía nombre: con dos en la lista, un lector de
            // pantalla anunciaba «interruptor, desactivado» dos veces y no había forma de saber
            // cuál era cuál. El título está al lado, pero al lado no es dentro.
            {...rotulos}
            onClick={() => onChange(!isOn)}
            // El carril mide 44×24 y no puede crecer sin dejar de parecer un
            // interruptor, así que la diana táctil es el botón que lo envuelve
            // (T2-40): 44 px de alto hasta `md`, sin tocar el dibujo.
            className="group inline-flex min-h-11 items-center rounded-full focus:outline-none md:min-h-0"
        >
            <span
                // `ring-offset-surface` (T4-11): el hueco de 2px entre el control y el anillo
                // lo pinta Tailwind de blanco por defecto —`--tw-ring-offset-color: #fff`—,
                // así que en tema oscuro el foco dibujaba un halo blanco sobre la tarjeta.
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-surface ${isOn ? "bg-primary" : "bg-border"}`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform ${isOn ? "translate-x-6" : "translate-x-1"}`}
                />
            </span>
        </button>
    );
}

export default function SettingsPage() {
    const { t } = useT();
    const { data: settings = [], isLoading } = useSettings();
    const updateMutation = useUpdateSettings();

    // Solo se guardan los ajustes que el usuario ha tocado. El valor mostrado se
    // deriva en render (`valorDe`), en lugar de copiar la respuesta del servidor a
    // un estado local con un efecto: `settings` viene de `data ?? []`, que era un
    // array nuevo en cada render mientras la consulta cargaba, y el efecto se
    // reejecutaba encadenando renders.
    const [cambios, setCambios] = useState<SettingUpdates>({});

    const valorDe = (entry: { key: string; value: SettingValue }): SettingValue =>
        entry.key in cambios ? cambios[entry.key] : entry.value;

    const handleChange = (key: string, value: SettingValue) => {
        setCambios((prev) => ({ ...prev, [key]: value }));
    };

    // Volver a poner un ajuste en su valor original deja de contar como cambio.
    const pendientes = settings.filter((s) => s.key in cambios && cambios[s.key] !== s.value);
    const isDirty = pendientes.length > 0;

    // T6-03 — solo se juzga lo que se ha tocado: un valor que ya estaba guardado no se pinta
    // en rojo al abrir la página.
    const errorDe = (entry: SettingEntry): Clave | null =>
        entry.key in cambios ? errorDeAjuste(entry.key, cambios[entry.key]) : null;
    const hayErrores = pendientes.some((s) => errorDe(s) !== null);

    const delNegocio = settings.filter((s) => s.group === "business");
    const generales = settings.filter((s) => s.group !== "business");

    const handleSave = () => {
        const payload: SettingUpdates = {};
        pendientes.forEach((s) => { payload[s.key] = cambios[s.key]; });

        // Al confirmarse, la consulta se invalida y los valores vuelven a salir del
        // servidor: limpiar los cambios evita que sigan pisando la respuesta nueva.
        updateMutation.mutate(payload, { onSuccess: () => setCambios({}) });
    };

    /** Una fila de ajuste: la pintan igual las dos tarjetas. */
    const fila = (entry: SettingEntry) => {
        const error = errorDe(entry);
        // Los textos del negocio son anchos; el símbolo de la moneda, cinco caracteres.
        const esTexto = entry.type === "string" && entry.key !== "timezone";

        return (
            <div
                key={entry.key}
                // T5-09 — en móvil, un campo o un desplegable van **debajo** del texto:
                // al lado dejaban la descripción en una columna de tres palabras y
                // cortaban el nombre de la zona horaria. El interruptor sí cabe al lado.
                className={cn(
                    "px-6 py-5 flex justify-between gap-6",
                    entry.type === "boolean" ? "items-center" : "flex-col gap-3 sm:flex-row sm:items-center sm:gap-6",
                )}
            >
                {/*
                  * T4-04 — el rótulo lo manda la API **en español**, así que la
                  * interfaz prefiere el suyo y solo cae al del servidor si el
                  * ajuste es tan nuevo que aquí todavía no tiene traducción. Se
                  * comprueba con `existeClave` porque la clave se construye con
                  * un dato del servidor: sin eso saldría la clave en crudo.
                  */}
                <div className="flex-1">
                    <p id={rotulosDe(entry.key)["aria-labelledby"]} className="text-sm font-medium text-foreground">{textoDeAjuste(t, entry.key, "titulo", entry.label)}</p>
                    <p id={rotulosDe(entry.key)["aria-describedby"]} className="text-xs text-foreground-muted mt-0.5">{textoDeAjuste(t, entry.key, "descripcion", entry.description)}</p>
                </div>
                <div className={cn("shrink-0", esTexto && (entry.key === "currencySymbol" ? "sm:w-28" : "sm:w-72"))}>
                    {entry.type === "boolean" ? (
                        <BooleanToggle
                            {...rotulosDe(entry.key)}
                            value={valorDe(entry)}
                            onChange={(value) => handleChange(entry.key, value)}
                        />
                    ) : entry.key === "timezone" ? (
                        <Select
                            aria-label={textoDeAjuste(t, entry.key, "titulo", entry.label)}
                            aria-describedby={rotulosDe(entry.key)["aria-describedby"]}
                            value={String(valorDe(entry))}
                            options={opcionesDeZona(String(entry.value))}
                            onChange={(e) => handleChange(entry.key, e.target.value)}
                            className="w-full sm:w-60"
                        />
                    ) : entry.key === "taxRate" ? (
                        // T6-05 — con `Input` y no con el campo numérico de abajo: este puede
                        // estar mal —101, tres decimales— y tiene que poder decirlo.
                        <Input
                            id={`ajuste-${entry.key}`}
                            aria-labelledby={rotulosDe(entry.key)["aria-labelledby"]}
                            aria-describedby={cn(rotulosDe(entry.key)["aria-describedby"], error && `ajuste-${entry.key}-error`)}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={TASA_DE_IMPUESTO_MAXIMA}
                            step="0.01"
                            value={String(valorDe(entry))}
                            error={error ? t(error) : undefined}
                            onChange={(e) => handleChange(entry.key, Number(e.target.value))}
                            className="w-full sm:w-40"
                        />
                    ) : entry.type === "number" ? (
                        <input
                            {...rotulosDe(entry.key)}
                            type="number"
                            value={String(valorDe(entry))}
                            onChange={(e) => handleChange(entry.key, Number(e.target.value))}
                            className="min-h-11 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition w-40 md:min-h-9"
                        />
                    ) : (
                        // T6-03 — un texto va con `Input`, que trae el borde de error y ata
                        // el mensaje al campo. El `id` es del que saca el nombre de su mensaje.
                        <Input
                            id={`ajuste-${entry.key}`}
                            aria-labelledby={rotulosDe(entry.key)["aria-labelledby"]}
                            aria-describedby={cn(rotulosDe(entry.key)["aria-describedby"], error && `ajuste-${entry.key}-error`)}
                            value={String(valorDe(entry))}
                            maxLength={entry.maxLength}
                            inputMode={TECLADO[entry.key]}
                            autoComplete="off"
                            spellCheck={false}
                            error={error ? t(error) : undefined}
                            onChange={(e) => handleChange(entry.key, e.target.value)}
                            className="w-full"
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t("configuracion.titulo")}</h1>
                <p className="text-sm text-foreground-muted mt-1">{t("configuracion.subtitulo")}</p>
            </div>

            {/*
              * T4-11 — el tema va en su propia tarjeta, y no en la lista de abajo, porque no
              * es lo mismo: los ajustes de la aplicación los comparten todos los usuarios y
              * se confirman con «Guardar cambios»; el tema es local y se aplica al instante.
              * Por eso el botón bajó del encabezado de la página a la tarjeta que le
              * corresponde: ahí arriba parecía gobernar también esta sección.
              */}
            <section className="bg-surface rounded-xl border border-border px-6 py-5">
                <h2 className="text-base font-semibold text-foreground">{t("configuracion.apariencia")}</h2>
                <div className="mt-4 space-y-5">
                    <SelectorDeTema />
                    <SelectorDeIdioma />
                </div>
            </section>

            {/* En móvil el título se apila sobre el botón: en una fila, «Ajustes de la
                aplicación» parte en dos líneas y queda apretado contra «Guardar cambios». */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold text-foreground">{t("configuracion.ajustes")}</h2>
                    <p className="text-xs text-foreground-muted mt-0.5">{t("configuracion.ajustesAyuda")}</p>
                </div>
                <Button onClick={handleSave} disabled={!isDirty || hayErrores} isLoading={updateMutation.isPending}>
                    {t("comun.guardarCambios")}
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : (
                <>
                    {/*
                      * T6-03 — quién vende y en qué moneda, en su propia tarjeta: no son
                      * interruptores de funcionamiento, son los datos que encabezan un
                      * comprobante. Solo sale si el servidor los manda.
                      */}
                    {delNegocio.length > 0 && (
                        <section aria-labelledby="configuracion-negocio" className="bg-surface rounded-xl border border-border">
                            <div className="px-6 pt-5">
                                <h3 id="configuracion-negocio" className="text-sm font-semibold text-foreground">{t("configuracion.negocio")}</h3>
                                <p className="text-xs text-foreground-muted mt-0.5">{t("configuracion.negocioAyuda")}</p>
                            </div>
                            <div className="divide-y divide-border">
                                <LogoDelNegocio />
                                {delNegocio.map(fila)}
                            </div>
                        </section>
                    )}

                    <section aria-labelledby="configuracion-funcionamiento" className="bg-surface rounded-xl border border-border">
                        <h3 id="configuracion-funcionamiento" className="px-6 pt-5 text-sm font-semibold text-foreground">{t("configuracion.funcionamiento")}</h3>
                        <div className="divide-y divide-border">{generales.map(fila)}</div>
                    </section>
                </>
            )}
        </div>
    );
}
