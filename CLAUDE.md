# Stockly — Frontend

SPA de React 19 sobre Vite. El backend vive en un repositorio hermano, `Stockly-B`, que se clona al
lado (`01-Stockly/Stockly-B` y `01-Stockly/Stockly-F`). **La documentación de los dos repositorios
está allí, en `Stockly-B/docs/`**: si no lo tienes clonado, clónalo antes de planificar nada.

## Qué leer, y cuándo

| Cuándo | Documento |
|---|---|
| **Antes de tocar cualquier pantalla** | [`docs/design-system.md`](docs/design-system.md), de este repositorio. No es una guía opcional: varias de sus reglas ponen `pnpm verify` en rojo |
| **Al retomar el proyecto** | `Stockly-B/docs/CONTEXTO.md`: estado, trampas del entorno ya pagadas (§4) y decisiones que no conviene deshacer (§6) |
| Antes de planificar trabajo | `Stockly-B/docs/ROADMAP.md` |
| Antes de simplificar algo que parezca complicado de más | `Stockly-B/docs/adr/` |
| Antes de añadir una dependencia | `Stockly-B/docs/dependencias.md` |
| Antes de cambiar navegación o formularios | `Stockly-B/docs/accesibilidad.md` |
| Para la puerta de calidad, la CI, los commits y el cierre de una tarea | `Stockly-B/CONTRIBUTING.md` |

**Al cerrar una tarea, se anota en el ROADMAP**, aunque el cambio sea de este repositorio.

## Verificación

```bash
pnpm verify           # antes de cada commit; la CI lo repite, no lo sustituye
pnpm test:e2e:full    # Playwright, en chromium y Mobile Chrome
```

`verify` encadena `check → lint → test:coverage → build → auditoria`.

- **`pnpm lint` termina con 0 errores y 0 avisos.** Un aviso nuevo es una regresión.
- **`auditoria`** rompe ante una vulnerabilidad alta o crítica en producción o una licencia fuera
  de la lista; sin red avisa, salvo con `--estricto`. **Al cambiar las dependencias hay que
  regenerar `public/AVISOS-DE-TERCEROS.txt`** con `pnpm auditoria --informe`: la aplicación
  distribuye la tipografía Inter y su licencia exige que el aviso la acompañe.
- **El E2E no necesita levantar nada a mano**: `e2e/global-setup.ts` prepara la base —migra y
  **resiembra la de desarrollo**— y Playwright arranca backend y frontend, con el límite de
  peticiones subido. Los reintentos están en 0: sus fallos intermitentes han sido siempre
  defectos reales. Si falla de forma rara, mira antes los puertos 3000 y 5173 (CONTEXTO §4).
- **Un cambio de contrato se sube primero al backend**: la CI de aquí clona su `main` y comprueba
  que la copia esté al día.

## Reglas

- **pnpm 12.4.1**, fijado en `packageManager` y en el `Dockerfile`. No usar npm ni yarn.
- **Comentarios y documentación en español.**
- **Nunca una contraseña real en `e2e/`**: está versionado. Sus credenciales salen del seed del
  backend y son sobreescribibles por variables de entorno.
- **`.agents/` y `.claude/` se versionan a propósito.** Son la mayoría de los archivos rastreados:
  para buscar en el código, `git buscar X` o `git grep X -- ":!.agents" ":!.claude"`.
- **Los tipos de las respuestas de la API no se escriben aquí.**
  `src/shared/contratos/api.generated.ts` es una copia literal de
  `Stockly-B/src/contratos/api.ts`; los tipos de cada módulo son alias de los suyos. Se cambia
  **en el backend** y se regenera allí con `pnpm contratos:generar`. Editar la copia no sirve:
  `frescura.test.ts` lo detecta.
- **`price` y los `unitPrice` son `string | number`**: los `Decimal` de Prisma llegan como cadena.
  Para convertir, `aNumero()` del contrato. `/reports` es la excepción y sí manda números.
- **Un botón que llama a la API se enseña con `usePuede()`, no con `role === "ADMIN"`.** Hay tres
  roles, y `puede("POST /sale-orders/:id/ship")` consulta la misma matriz con la que el backend
  protege esa ruta.
- **Ningún texto de interfaz se escribe en un componente.** Sale de `src/shared/i18n/es.ts` y se
  pinta con `t()` / `tn()` de `useT()`; los esquemas Zod guardan **la clave** y la traduce `te()`.
  `en.ts` es un `Record` sobre las claves de `es.ts`: una traducción que falte no compila.
  `literales.test.ts` falla ante una cadena a mano —en un nodo JSX, una prop visible o un
  `toast`— y `catalogo.test.ts` ante una clave que ya no lee nadie. Las familias dinámicas
  (`error.*`, `auditoria.*`, `ajuste.*`) están exentas **una a una**: ampliar esa lista apaga la
  comprobación de un módulo entero. Las fechas van por `shared/lib/fechas.ts`.
- **Un listado paginado no se filtra en el navegador.** Los filtros viajan en la query. Los
  recuentos se leen de `meta.total`, cambiar un filtro **vuelve a la página 1** y un gráfico que
  dibuja una página lo dice. Exportar va por el endpoint del backend, nunca desde lo que hay en
  memoria.
- **Las descargas van por `descargarDeLaApi`** (`shared/api/descargar.ts`), no por un enlace.
- **Los correos no se traducen aquí.** De este lado solo hay dos piezas: el interceptor de axios
  manda el idioma efectivo en `Accept-Language`, y `useSincronizarIdioma` lo deja en
  `users.idioma` cuando deja de coincidir. Si cambia dónde vive la preferencia de idioma, se
  mueven las dos.
- **Al añadir una ruta hay que darle título** en `shared/lib/titulos.ts`, o `titulos.test.ts`
  falla.
- **Una dependencia que se carga bajo demanda necesita su regla en `manualChunks`**
  (`vite.config.ts`), o cae en `vendor` y viaja en el primer arranque.

## CodeGraph

Este repositorio tiene además un `.claude/CLAUDE.md` con las instrucciones del índice CodeGraph.
Ambos archivos se aplican.
