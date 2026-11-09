import { type ButtonHTMLAttributes } from "react";
import { clasesDeBoton, type VarianteBoton } from "@/shared/lib/clasesDeBoton";
import { Spinner } from "@/shared/components/Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: VarianteBoton;
    isLoading?: boolean;
}

export function Button({
    variant = "primary",
    isLoading = false,
    disabled,
    className,
    children,
    onClick,
    ...props
}: ButtonProps) {
    // AUD-014 — mientras carga no se desactiva: se marca `aria-disabled` y el clic no hace nada.
    // Con `disabled`, el botón que tenía el foco lo soltaba y caía en `<body>`: quien había
    // tabulado hasta «Entrar» perdía su sitio al fallar. Es el patrón de `ErrorDeCarga`. El
    // `preventDefault` frena también el envío implícito de un formulario con Intro, que el
    // navegador hace como un clic en este botón.
    return (
        <button
            disabled={disabled}
            aria-disabled={isLoading || undefined}
            aria-busy={isLoading || undefined}
            className={clasesDeBoton(variant, className)}
            onClick={(e) => {
                if (isLoading) {
                    e.preventDefault();
                    return;
                }
                onClick?.(e);
            }}
            {...props}
        >
            {isLoading && <Spinner size="sm" decorativo className="border-current border-t-transparent" />}
            {children}
        </button>
    );
}
