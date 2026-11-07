---
target: acceso (media de 6 pantallas; la peor, 19)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 5
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\auth\\components"
timestamp: 2026-11-07T12-35-49Z
slug: src-modules-auth-components
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador) — crítica del proyecto pantalla por pantalla, 2026-11-06/07

## Acceso (sin sesión) — notas por pantalla

| Pantalla | Nota | Banda |
|---|---|---|
| Iniciar sesión (`LoginPage.tsx`) | 27/40 | Aceptable |
| Registro (`RegisterPage.tsx`) | 25/40 | Aceptable |
| Olvidé la contraseña (`ForgotPasswordPage.tsx`) | 28/40 | Buena |
| Restablecer contraseña (`ResetPasswordPage.tsx`) | 19/40 | Pobre |
| Confirmar cuenta (`VerifyEmailPage.tsx`) | 21/40 | Aceptable |
| Reenviar verificación (`ResendVerificationPage.tsx`) | 24/40 | Aceptable |

Detector: CLI limpia; navegador, solo el falso positivo de TanStack. Sin `h1` en los estados sin token de restablecer y confirmar.

## Común a las seis
- Los errores del servidor solo salen en un aviso que dura 3 s, lejos del formulario (`main.tsx:16`), y siempre en tema claro.
- Dos validaciones: la burbuja nativa de `type="email"` (sin `noValidate`) y la de Zod.
- «Token» en la interfaz.
- La marca solo está en el login.

## Problemas prioritarios
1. [P1] Login: «cuenta pendiente de aprobación» y «credenciales inválidas» en un aviso de 3 s. Bloque persistente en la tarjeta con `role="alert"`. harden/clarify.
2. [P1] Registro: no anticipa la confirmación por correo ni la aprobación de un ADMIN; tras enviar, aviso y redirección. Línea fija + pantalla «Revisa tu correo». onboard/clarify.
3. [P1] Restablecer: sin token o con token inválido, callejón sin salida sin `h1` ni enlaces. Tarjeta «Este enlace ya no sirve» + «Pedir un enlace nuevo». harden/clarify.
4. [P1] Confirmar cuenta: «ya verificada» se presenta como error; debería decir que espera aprobación. harden/clarify.
5. [P1] Reenviar: error ambiguo «no encontrada o ya verificada» en un aviso de 3 s y revela si la cuenta existe. clarify/harden.
6. [P2] Placeholder `••••••••` que parece rellenado; sin mostrar contraseña; requisito de 8 caracteres solo en el placeholder; foco en `body` tras el éxito en Olvidé y Reenviar.

## Persona red flags
- Jordan (primera vez): no sabe que hace falta aprobación; los avisos desaparecen; lee «Token».
- Sam: foco perdido tras el éxito; estados sin `h1`; avisos de 3 s (WCAG 2.2.1).
- Alex: sin foco inicial en el correo; sin mostrar contraseña.
