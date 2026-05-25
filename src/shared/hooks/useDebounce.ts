import { useEffect, useState } from "react";

// Hook personalizado para manejar el valor debounced, retrasando la actualización hasta que el usuario deje de escribir por un tiempo.
export function useDebounce<T>(value: T, delay: number = 400): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
