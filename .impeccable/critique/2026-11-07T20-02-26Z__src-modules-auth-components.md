---
target: acceso tras AUD-014 (media de 6 pantallas; la peor, 19)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\auth\\components"
timestamp: 2026-11-07T20-02-26Z
slug: src-modules-auth-components
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador) — repetición tras AUD-014, 2026-11-07

## Notas por pantalla (Nielsen, 0–4)

| Heurística | Login | Registro | Olvidé | Restablecer (+ invitación) | Confirmar | Reenviar |
|---|---|---|---|---|---|---|
| 1. Visibilidad del estado | 3 | 3 | 3 | 2 | 3 | 3 |
| 2. Lenguaje del usuario | 2 | 3 | 3 | 3 | 3 | 3 |
| 3. Control y libertad | 3 | 3 | 2 | 1 | 3 | 2 |
| 4. Consistencia | 3 | 2 | 3 | 2 | 2 | 3 |
| 5. Prevención de errores | 3 | 2 | 2 | 1 | 3 | 2 |
| 6. Reconocer antes que recordar | 3 | 3 | 2 | 2 | 3 | 2 |
| 7. Flexibilidad y eficiencia | 2 | 2 | 2 | 2 | 3 | 2 |
| 8. Estético y minimalista | 3 | 3 | 3 | 2 | 3 | 3 |
| 9. Recuperarse de errores | 2 | 2 | 3 | 2 | 3 | 3 |
| 10. Ayuda y documentación | 2 | 4 | 2 | 2 | 3 | 2 |
| **Total /40** | **26** | **27** | **25** | **19** | **29** | **25** |

Media del bloque: 25,2/40 (antes, 24). Criterio de AUD-014 (sin P1, ninguna por debajo de 24): no cumplido.

## Especificidad
Visualmente intercambiable (tarjeta centrada con logo); la especificidad está en el texto: pasos de la aprobación, «pendiente», «ya estaba confirmada», invitación.
Detector: CLI limpio (0 hallazgos, salida 0). Navegador, 7 páginas × 2 anchos: solo `shape-assembled-illustration` sobre el logo de las devtools de TanStack (falso positivo, solo en desarrollo).

## Problemas prioritarios
1. [P1] Restablecer con enlace caducado: el token se descubre al enviar, la tarjeta se sustituye, lo escrito se pierde, el foco cae en `body` y no se anuncia nada. Fix: validar el token al cargar (endpoint ligero) y enseñar `EnlaceCaducado` antes; en `EnlaceCaducado`, foco al h1 o `role="alert"`.
2. [P1] Invitación caducada: dos «Volver al inicio de sesión» idénticos, y llevan a un login donde un invitado no puede entrar. Fix: `pedirOtro` opcional; ofrecer «Restablecer contraseña» si la cuenta ya existe.
3. [P2] «Credenciales inválidas»: jerga y sin salida → «El correo o la contraseña no son correctos» + «¿Olvidaste tu contraseña?» en el aviso.
4. [P2] El éxito de restablecer va en un aviso flotante de 6 s → mensaje en la tarjeta del login (`role="status"`).
5. [P2] «Mínimo 8 caracteres» duplicado como ayuda y como error.
6. [P2] El correo no viaja entre login, Olvidé y Reenviar.
7. [P2] «Enviado» no dice a qué dirección ni deja corregirla.
8. [P2] «Correo ya registrado» sin salida.
9. [P2] Enlaces sueltos de 15–20 px de alto en táctil.
10. [P2] El título de la pestaña y el anuncio de ruta no coinciden con el h1 en los estados caducados.

## Persona red flags
- Jordan: «Credenciales inválidas»; invitación caducada sin salida real; no sabe si escribió bien el correo.
- Sam: silencio y foco perdido al enviar con token caducado; anuncio de ruta ≠ h1; requisito leído dos veces.
- Casey: enlaces pequeños; reescribir el correo entre pantallas.

## Menores (P3)
«email» frente a «correo» en la validación; subtítulos que repiten la marca; línea de reenviar siempre visible en el login; marco sin `py`; registro sin `autoFocus`; Restablecer sin `username` oculto para gestores de contraseñas; sin selector de idioma sin sesión.

## Preguntas
- ¿La invitación debería ser un flujo de bienvenida propio y no una variante de «restablecer»?
- ¿El nombre o logo del comercio junto a «Stockly» haría la tarjeta inconfundible?
- ¿«Regístrate» o «Solicitar acceso», si siempre acaba en aprobación?
