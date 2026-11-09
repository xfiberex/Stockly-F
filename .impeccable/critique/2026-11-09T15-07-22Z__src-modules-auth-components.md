---
target: acceso tras la segunda tanda de AUD-014 (media de 6 pantallas; la peor, 24)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\14 - IA Mentor\\01-Stockly\\Stockly-F\\src\\modules\\auth\\components"
timestamp: 2026-11-09T15-07-22Z
slug: src-modules-auth-components
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador) — tercera crítica del bloque, tras la segunda tanda de AUD-014, 2026-11-09

## Notas por pantalla (Nielsen, 0–4)

| Heurística | Login | Registro | Olvidé | Restablecer (+ invitación) | Confirmar | Reenviar |
|---|---|---|---|---|---|---|
| 1. Visibilidad del estado | 3 | 3 | 3 | 2 | 2 | 3 |
| 2. Lenguaje del usuario | 3 | 3 | 3 | 2 | 3 | 2 |
| 3. Control y libertad | 3 | 3 | 4 | 2 | 3 | 4 |
| 4. Consistencia | 3 | 3 | 3 | 2 | 2 | 2 |
| 5. Prevención de errores | 3 | 3 | 3 | 3 | 3 | 3 |
| 6. Reconocer antes que recordar | 3 | 3 | 3 | 2 | 3 | 3 |
| 7. Flexibilidad y eficiencia | 3 | 2 | 3 | 3 | 3 | 3 |
| 8. Estético y minimalista | 3 | 3 | 3 | 3 | 3 | 3 |
| 9. Recuperarse de errores | 3 | 2 | 3 | 3 | 3 | 3 |
| 10. Ayuda y documentación | 2 | 3 | 3 | 2 | 2 | 2 |
| **Total /40** | **29** | **28** | **31** | **24** | **27** | **28** |

Media del bloque: 27,8/40 (antes 25,2 y 24). Ninguna por debajo de 24 (la más baja, Restablecer, 24; antes 19). Un P1. Criterio de AUD-014: no cumplido por el P1.

## Especificidad
Específica en el texto y los estados (los dos pasos del registro, «ya estaba confirmada», la invitación, «Este enlace ya no sirve», el correo que viaja); visualmente intercambiable (tarjeta centrada con logo), aceptable para Operate.
Detector: CLI limpio (0, salida 0). Navegador, 9 vistas × 2 anchos: `shape-assembled-illustration` en todas (falso positivo: logo de las devtools de TanStack, solo en desarrollo); en el login con error, `straggler` real («correctos» sola en la última línea) y `nested-cards` discutible (el aviso dentro de la tarjeta). Sin scroll horizontal; contraste de enlaces ≥ 6,5:1.

## Problemas prioritarios
1. [P1] La invitación caducada habla de «restablecer» y «recuperar» a quien nunca tuvo contraseña: botón «Restablecer contraseña» (`ResetPasswordPage.tsx:37`) que lleva a «Recuperar contraseña», y «Tu cuenta ya existe» (`es.ts:363`). Fix: «Pedir un enlace nuevo», texto «La invitación ha caducado. Pide un enlace nuevo con tu correo para elegir tu contraseña, o pide a quien te invitó que te la reenvíe», y Olvidé con título neutro si viene de una invitación.
2. [P2] La invitación con enlace bueno no dice para qué cuenta es: correo solo en el input oculto; pestaña y anuncio «Nueva contraseña» frente al h1 «Elige tu contraseña»; etiqueta «Nueva contraseña»; sin enlace de vuelta. Fix: «Para {correo}», `useTituloDePantalla` en la invitación, etiqueta «Contraseña», «Volver al inicio de sesión».
3. [P2] El foco cae en `<body>` tras enviar con el botón: `Button` se desactiva con `isLoading` (medido en Login y Registro; coincide con B). Fix: `aria-disabled` + bloquear el envío durante la carga, o foco al aviso.
4. [P2] Errores del servidor de un campo, lejos del campo: «El correo ya está registrado» arriba de la tarjeta, fuera de la vista con el teclado abierto en móvil. Fix: `setError("email")`, foco al campo, salidas bajo él.
5. [P2] Confirmar no anuncia el resultado: el h1 cambia sin foco, el `role="status"` nace lleno, la pestaña dice «Confirmar cuenta». Fix: `enfocarTitulo` y `useTituloDePantalla` en «hecho» y «error».

## Personas
- Jordan: invitación caducada; no sabe con qué correo entrará; «Te avisaremos por correo» sin plazo; vocabulario confirmar/verificación/confirmación mezclado.
- Sam: foco en `body` tras enviar; Confirmar sin anuncio; dos «Mostrar la contraseña» con el mismo nombre; cuatro `alert` a la vez al enviar vacío el registro; anillo de foco del botón primario del navegador, con poco contraste.
- Casey: `autoFocus` en Registro y Olvidé abre el teclado y tapa el contexto; «Regístrate» e «Inicia sesión» de 17 px de alto (B: 68×17 y 83×17); error del registro fuera de la vista; `p-8` deja los campos en 292 de 390 px.

## Menores
Doble «¿Olvidaste tu contraseña?» con el aviso de credenciales (y doble «Inicia sesión» con el correo duplicado); subtítulo de Olvidé en futuro tras enviar; éxito de Olvidé con dos enlaces del mismo peso; spinner de sesión que salta a la tarjeta y usa `border-t-blue-600`; el botón «Entrar» se desplaza al aparecer el aviso; botón primario gris claro en oscuro; placeholder con mucho contraste; Registro con contraseña vacía dice «Mínimo 8» y no «obligatoria»; Registro revela si el correo existe y Olvidé no (decisión de producto); sin selector de idioma (AUD-016); `gap-1` en `EnlaceCaducado`; «Pide otro desde aquí» vago; «correctos» sola (straggler).

## Preguntas
1. Si un ADMIN aprueba cada registro, ¿hace falta registro público o basta la invitación?
2. ¿Por qué Confirmar con aprobación pendiente manda al login, donde no puede pasar nada?
3. ¿Por qué la invitación es anónima si conoce el correo y a quien invita?
