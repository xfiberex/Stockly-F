import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/shared/hooks/useDebounce";

describe("useDebounce", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("devuelve el valor inicial inmediatamente", () => {
        const { result } = renderHook(() => useDebounce("inicial", 400));
        expect(result.current).toBe("inicial");
    });

    it("no actualiza antes de que transcurra el delay", () => {
        const { result, rerender } = renderHook(({ val }) => useDebounce(val, 400), {
            initialProps: { val: "a" },
        });
        rerender({ val: "b" });
        act(() => vi.advanceTimersByTime(200));
        expect(result.current).toBe("a");
    });

    it("actualiza el valor una vez transcurrido el delay", () => {
        const { result, rerender } = renderHook(({ val }) => useDebounce(val, 400), {
            initialProps: { val: "a" },
        });
        rerender({ val: "b" });
        act(() => vi.advanceTimersByTime(400));
        expect(result.current).toBe("b");
    });

    it("cancela el timer anterior al cambiar el valor antes del delay", () => {
        const { result, rerender } = renderHook(({ val }) => useDebounce(val, 400), {
            initialProps: { val: "a" },
        });
        rerender({ val: "b" });
        act(() => vi.advanceTimersByTime(200));
        rerender({ val: "c" });
        act(() => vi.advanceTimersByTime(400));
        expect(result.current).toBe("c");
    });

    it("usa 400ms como delay por defecto", () => {
        const { result, rerender } = renderHook(({ val }) => useDebounce(val), {
            initialProps: { val: "inicio" },
        });
        rerender({ val: "fin" });
        act(() => vi.advanceTimersByTime(399));
        expect(result.current).toBe("inicio");
        act(() => vi.advanceTimersByTime(1));
        expect(result.current).toBe("fin");
    });
});
