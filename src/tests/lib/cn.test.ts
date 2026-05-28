import { cn } from "@/shared/lib/cn";

describe("cn — utilidad de clases CSS", () => {
    it("combina strings simples", () => {
        expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
    });

    it("ignora valores falsy (false, undefined, null)", () => {
        expect(cn("base", false && "no-aparece", undefined, null as unknown as string)).toBe("base");
    });

    it("resuelve conflictos de Tailwind conservando la última clase", () => {
        expect(cn("px-2", "px-4")).toBe("px-4");
        expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("soporta objetos condicionales", () => {
        expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe("text-red-500");
    });

    it("combina strings y objetos", () => {
        expect(cn("base", { active: true, inactive: false })).toBe("base active");
    });

    it("devuelve string vacío sin argumentos", () => {
        expect(cn()).toBe("");
    });
});
