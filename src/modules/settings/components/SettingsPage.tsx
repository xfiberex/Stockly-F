import { useEffect, useState } from "react";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { useSettings, useUpdateSettings } from "@/modules/settings/hooks/useSettings";
import type { SettingEntry } from "@/modules/settings/types/settings.types";

function BooleanToggle({ entry, onChange }: { entry: SettingEntry; onChange: (key: string, value: string) => void }) {
    const isOn = entry.value === "true";
    return (
        <button
            type="button"
            role="switch"
            aria-checked={isOn}
            onClick={() => onChange(entry.key, isOn ? "false" : "true")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isOn ? "bg-blue-600" : "bg-gray-200"}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isOn ? "translate-x-6" : "translate-x-1"}`}
            />
        </button>
    );
}

export default function SettingsPage() {
    const { data: settings = [], isLoading } = useSettings();
    const updateMutation = useUpdateSettings();

    const [localValues, setLocalValues] = useState<Record<string, string>>({});

    useEffect(() => {
        const initial: Record<string, string> = {};
        settings.forEach((s) => { initial[s.key] = s.value; });
        setLocalValues(initial);
    }, [settings]);

    const handleChange = (key: string, value: string) => {
        setLocalValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        updateMutation.mutate(localValues);
    };

    const isDirty = settings.some((s) => localValues[s.key] !== s.value);

    return (
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
                    <p className="text-sm text-gray-500 mt-1">Ajustes generales de la aplicación</p>
                </div>
                <Button onClick={handleSave} disabled={!isDirty} isLoading={updateMutation.isPending}>
                    Guardar cambios
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {settings.map((entry) => (
                        <div key={entry.key} className="px-6 py-5 flex items-center justify-between gap-6">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{entry.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{entry.description}</p>
                            </div>
                            <div className="shrink-0">
                                {entry.type === "boolean" ? (
                                    <BooleanToggle
                                        entry={{ ...entry, value: localValues[entry.key] ?? entry.value }}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    <input
                                        type={entry.type === "number" ? "number" : "text"}
                                        value={localValues[entry.key] ?? entry.value}
                                        onChange={(e) => handleChange(entry.key, e.target.value)}
                                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition w-40"
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
