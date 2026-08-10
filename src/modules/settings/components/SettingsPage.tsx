import { useState } from "react";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { SelectorDeTema } from "@/modules/settings/components/SelectorDeTema";
import { useSettings, useUpdateSettings } from "@/modules/settings/hooks/useSettings";
import type { SettingUpdates, SettingValue } from "@/modules/settings/types/settings.types";

// El backend envía los booleanos ya parseados, pero un valor tecleado en un input
// llega como cadena. Se aceptan ambas formas para no depender de por dónde vino.
function esVerdadero(value: SettingValue): boolean {
    return value === true || value === "true";
}

function BooleanToggle({ value, onChange }: { value: SettingValue; onChange: (value: boolean) => void }) {
    const isOn = esVerdadero(value);
    return (
        <button
            type="button"
            role="switch"
            aria-checked={isOn}
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

    const handleSave = () => {
        const payload: SettingUpdates = {};
        pendientes.forEach((s) => { payload[s.key] = cambios[s.key]; });

        // Al confirmarse, la consulta se invalida y los valores vuelven a salir del
        // servidor: limpiar los cambios evita que sigan pisando la respuesta nueva.
        updateMutation.mutate(payload, { onSuccess: () => setCambios({}) });
    };

    return (
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
                <p className="text-sm text-foreground-muted mt-1">Preferencias de este dispositivo y ajustes de la aplicación</p>
            </div>

            {/*
              * T4-11 — el tema va en su propia tarjeta, y no en la lista de abajo, porque no
              * es lo mismo: los ajustes de la aplicación los comparten todos los usuarios y
              * se confirman con «Guardar cambios»; el tema es local y se aplica al instante.
              * Por eso el botón bajó del encabezado de la página a la tarjeta que le
              * corresponde: ahí arriba parecía gobernar también esta sección.
              */}
            <section className="bg-surface rounded-xl border border-border px-6 py-5">
                <h2 className="text-base font-semibold text-foreground">Apariencia</h2>
                <div className="mt-4">
                    <SelectorDeTema />
                </div>
            </section>

            {/* En móvil el título se apila sobre el botón: en una fila, «Ajustes de la
                aplicación» parte en dos líneas y queda apretado contra «Guardar cambios». */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold text-foreground">Ajustes de la aplicación</h2>
                    <p className="text-xs text-foreground-muted mt-0.5">Afectan a todos los usuarios</p>
                </div>
                <Button onClick={handleSave} disabled={!isDirty} isLoading={updateMutation.isPending}>
                    Guardar cambios
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : (
                <div className="bg-surface rounded-xl border border-border divide-y divide-border">
                    {settings.map((entry) => (
                        <div key={entry.key} className="px-6 py-5 flex items-center justify-between gap-6">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">{entry.label}</p>
                                <p className="text-xs text-foreground-muted mt-0.5">{entry.description}</p>
                            </div>
                            <div className="shrink-0">
                                {entry.type === "boolean" ? (
                                    <BooleanToggle
                                        value={valorDe(entry)}
                                        onChange={(value) => handleChange(entry.key, value)}
                                    />
                                ) : (
                                    <input
                                        type={entry.type === "number" ? "number" : "text"}
                                        value={String(valorDe(entry))}
                                        onChange={(e) => handleChange(
                                            entry.key,
                                            entry.type === "number" ? Number(e.target.value) : e.target.value,
                                        )}
                                        className="min-h-11 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition w-40 md:min-h-9"
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
