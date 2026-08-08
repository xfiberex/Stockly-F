import { cn } from "@/shared/lib/cn";

describe("cn — utilidad de clases CSS", () => {
    it("combina strings simples", () => {
        expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
    });

    it("ignora valores falsy (false, undefined, null)", () => {
        expect(cn("base", false, undefined, null)).toBe("base");
    });

    it("resuelve conflictos de Tailwind conservando la última clase", () => {
        expect(cn("px-2", "px-4")).toBe("px-4");
        expect(cn("text-danger", "text-info")).toBe("text-info");
    });

    it("soporta objetos condicionales", () => {
        expect(cn({ "text-danger": true, "text-info": false })).toBe("text-danger");
    });

    it("combina strings y objetos", () => {
        expect(cn("base", { active: true, inactive: false })).toBe("base active");
    });

    it("devuelve string vacío sin argumentos", () => {
        expect(cn()).toBe("");
    });
});
