---
target: acceso, crítica de cierre de AUD-014 (media de 6 pantallas; la peor, 28)
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\auth\\components"
timestamp: 2026-11-18T22-34-22Z
slug: src-modules-auth-components
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador) — cuarta crítica del bloque, crítica de cierre de AUD-014, 2026-11-18

## Notas por pantalla (Nielsen, 0–4)

| Heurística | Login | Registro | Olvidé | Restablecer (+ invitación) | Confirmar | Reenviar |
|---|---|---|---|---|---|---|
| 1. Visibilidad del estado | 3 | 3 | 3 | 3 | 3 | 3 |
| 2. Lenguaje del usuario | 3 | 3 | 3 | 3 | 3 | 3 |
| 3. Control y libertad | 3 | 2 | 4 | 3 | 3 | 4 |
| 4. Consistencia | 3 | 3 | 3 | 3 | 3 | 3 |
| 5. Prevención de errores | 3 | 3 | 3 | 3 | 2 | 3 |
| 6. Reconocer antes que recordar | 3 | 3 | 4 | 3 | 3 | 3 |
| 7. Flexibilidad y eficiencia | 3 | 2 | 3 | 3 | 3 | 3 |
| 8. Estético y minimalista | 3 | 3 | 3 | 3 | 4 | 2 |
| 9. Recuperarse de errores | 3 | 3 | 3 | 3 | 2 | 2 |
| 10. Ayuda y documentación | 2 | 3 | 3 | 2 | 3 | 3 |
| **Total /40** | **29** | **28** | **32** | **29** | **29** | **29** |

Media del bloque: 29,3/40 (24 → 25,2 → 27,8 → 29,3). La más baja, Registro, 28. Sin P0 ni P1: el criterio de AUD-014 se cumple.

## Especificidad
Visual intercambiable (tarjeta centrada con cubo), contenido específico: los dos pasos del registro anunciados, la invitación que habla de elegir y dice el correo, el enlace comprobado al abrir, el correo que viaja entre pantallas. Adecuado para Operate.
Detector: CLI limpio (0). Navegador, 7 vistas × 2 anchos: `shape-assembled-illustration` en todas (falso positivo, devtools de TanStack); `nested-cards` en el login con error (el aviso `role=alert` dentro de la tarjeta, `MarcoDeAcceso.tsx:104`; discutible). Sin desbordes, sin palabras sueltas.

## Problemas prioritarios
1. [P2] La cuenta pendiente de aprobación se pinta como error rojo con triángulo y `role=alert`, sin decir a quién acudir (`LoginPage.tsx:35-48`, `MarcoDeAcceso.tsx:96-110`). Fix: tono `info` (`role=status`, reloj) con el texto de `auth.verificar.esperaAprobacion`.
2. [P2] Tras restablecer, «Ya puedes entrar con ella» es falso para una cuenta pendiente (`useResetPassword.ts`, `es.ts:387-388`). Fix: `resetPassword` devuelve `pendingApproval`, como `verifyEmail`, y el aviso lo dice.
3. [P2] Enlace de confirmación caducado de una cuenta ya confirmada: manda a Reenviar, que no envía nada pero dice que sí (`VerifyEmailPage.tsx:65-73`, `es.ts:383`). Fix: «Si ya confirmaste tu cuenta no necesitas otro enlace: intenta iniciar sesión», sin revelar si existe.
4. [P2] El éxito del registro no deja corregir el correo y la pestaña sigue en «Crear cuenta» (`RegisterPage.tsx:40-56`). Fix: `useTituloDePantalla`, «Corregir el correo» con `registro.reset()` conservando los valores, correo en `font-medium` y `break-all`.
5. [P2] Los enlaces dentro del aviso de error del login miden 20 px de alto en táctil (B: «¿Olvidaste tu contraseña?» 171×20, `LoginPage.tsx:44`; por código, también «Reenviar el enlace», línea 39): van solos en su línea con `CLASES_ENLACE_EN_TEXTO`. Fix: `CLASES_ENLACE_SUELTO` (min-h-11 en táctil).

## Personas
- Jordan: la alerta roja de «pendiente» parece un fallo; «Ya puedes entrar» seguido de un rechazo; «Si ese correo ya tenía cuenta, te lo decimos en él» siembra dudas; la invitación no dice quién invita.
- Sam: tras registrarse el anuncio de ruta sigue en «Crear cuenta»; «pendiente» como `alert` asertivo; sin `aria-invalid` tras un error del servidor.
- Casey: enlaces de 20 px en el aviso del login; `autoFocus` del login también en táctil (`LoginPage.tsx:65`), al revés que Registro y Olvidé; en oscuro el botón secundario «Volver al inicio de sesión» queda a ~1,15:1 de la tarjeta; con errores, «Crear cuenta» baja a ~770 px.

## Menores
En desarrollo, StrictMode hace que la primera apertura del enlace de confirmación diga «ya estaba confirmada» (`VerifyEmailPage.tsx:34-57`; no pasa en producción; deduplicar por token). «Enviar instrucciones» cuando se manda un enlace, también en la invitación. «Elegir tu contraseña» frente a «Elige tu contraseña». «Elige una contraseña segura» promete más que los 8 caracteres. En el restablecimiento normal, h1 y etiqueta son ambos «Nueva contraseña» y no dice la cuenta. La alerta del login empuja el formulario ~110 px y parte «El correo o la contraseña no» (`text-pretty` en hijo de flex sin `flex-1`). La pestaña dice «Nueva contraseña» un instante antes de «Elige tu contraseña». Recargar Olvidé pierde «viene de una invitación». La invitación caducada dice «o ya se usó» sin ofrecer iniciar sesión. «Reenviar» repite tres veces lo mismo (h1, subtítulo y botón).

## Preguntas
1. Si «esperando aprobación» es el estado más frecuente de una cuenta recién creada, ¿por qué no tiene pantalla propia en vez de un aviso en el login que invita a seguir pulsando «Entrar»?
2. ¿Por qué la invitación dice «Te han invitado a Stockly» y no quién invita ni a qué negocio?
3. ¿Basta con que el acceso sea correcto, o debería anticipar algo del producto a quien aún no tiene cuenta?
