# Stockly — Frontend

SPA de React 19 sobre Vite. El backend vive en un repositorio hermano, `Stockly-B`, que se clona al lado de este.

```
01-Stockly/
├── Stockly-B/   ← API + documentación viva del proyecto
└── Stockly-F/   ← este repositorio
```

## Documentación viva

Está en el repositorio del backend, en `Stockly-B/docs/`, y cubre **los dos repositorios**:

- `docs/CONTEXTO.md` — **empieza aquí al retomar el proyecto:** estado actual, decisiones vivas, trampas del entorno ya pagadas y por dónde seguir.
- `docs/ROADMAP.md` — 113 tareas con dependencias, progreso y métricas. La fuente de verdad del trabajo pendiente.
- `docs/operaciones.md` — copia de seguridad, restauración y reversión. Es del backend, pero la política de despliegue que describe afecta a los dos repositorios.
- `docs/dependencias.md` — vulnerabilidades y licencias de las dependencias de producción de **los dos** repositorios, y cómo funciona la puerta de `pnpm auditoria`. Léelo antes de añadir una dependencia.
- `docs/adr/` — decisiones de arquitectura no obvias: léelas antes de simplificar algo que parezca complicado de más.
- `docs/INFORME-AUDITORIA.md` — los hallazgos que justifican cada tarea. **Congelado a propósito:** está escrito en presente y describe el 2026-08-04, no el estado actual.
- `docs/README-proyecto.md` — arranque desde cero de los dos repositorios.
- `CONTRIBUTING.md` (en `Stockly-B`) — puerta de calidad, flujo de ramas y convención de commits.

De este repositorio: **[`docs/design-system.md`](docs/design-system.md) es lectura previa a tocar cualquier pantalla.** No es una guía de estilo opcional — varias de sus reglas hacen fallar `pnpm verify` si se incumplen.

Si no tienes clonado `Stockly-B`, esos documentos no están en disco: clónalo antes de planificar nada.

**Al cerrar una tarea, anótala en el ROADMAP**, aunque el cambio sea de este repositorio.

## Verificación: sin CI, todo en local

Este proyecto **no usa CI**. No hay GitHub Actions ni pipeline de ningún proveedor, y no deben proponerse: se descartaron deliberadamente el 2026-08-06. Por la misma razón, `playwright.config.ts` no depende de `process.env.CI`. La puerta de calidad es un comando local:

```bash
pnpm verify
```

Encadena `check → lint → test:coverage → build → auditoria`. El último paso ([scripts/auditoria.js](scripts/auditoria.js), T4-07) rompe la compilación ante una vulnerabilidad **alta o crítica** en dependencias de producción o ante una licencia fuera de la lista permitida; sin red avisa en vez de fallar, salvo con `--estricto`. Con `--informe` regenera `public/AVISOS-DE-TERCEROS.txt`, que **hay que regenerar al cambiar las dependencias**: la aplicación distribuye los `.woff2` de Inter y su licencia OFL exige que el aviso la acompañe. **Está en verde** desde el 2026-08-07 (T1-09): `pnpm lint` debe terminar con 0 errores y 0 avisos, así que cualquier aviso nuevo es una regresión, no ruido de fondo.

El E2E de Playwright (`pnpm test:e2e:full`) **no necesita levantar nada a mano** desde T1-24: `e2e/global-setup.ts` prepara la base de datos (migraciones + seed, recurriendo a Docker solo si no hay PostgreSQL escuchando) y el `webServer` arranca backend y frontend. Se ejecuta en dos proyectos, `chromium` y `Mobile Chrome`.

El E2E sube el techo del rate limit del backend con `RATE_LIMIT_MAX` y `AUTH_RATE_LIMIT_MAX`: una pasada del navegador supera las 100 peticiones/15 min por defecto. El limitador y la protección CSRF siguen activos durante la ejecución.

## Convenciones

- Gestor de paquetes: **pnpm 11.21.0** (fijado en `packageManager`, igual que el backend). No usar npm ni yarn. Se subió desde 11.2.2 el 2026-08-09: las versiones `<11.8.0` arrastraban avisos de path traversal y de ejecución de lifecycle scripts.
- Comentarios y documentación **en español**, como el resto del código.
- **`.agents/` y `.claude/` se versionan a propósito** (T3-06): el proyecto se trabaja desde varias máquinas y el tooling viaja con él. Son la mayoría de los archivos rastreados, así que para buscar en el código conviene excluirlos: `git buscar X` —tras activar una vez `git config --local include.path ../.gitconfig-stockly`— o `git grep X -- ":!.agents" ":!.claude"`.
- Las credenciales del E2E salen del seed del backend y son sobreescribibles por variables de entorno. **Nunca poner una contraseña real** en `e2e/`: ese directorio está versionado, y una fuga así ya obligó a reescribir el historial (tarea T0-06).
- **Los tipos de las respuestas de la API no se escriben aquí** (T4-01). `src/shared/contratos/api.generated.ts` es una copia literal de `Stockly-B/src/contratos/api.ts`, que es la fuente de verdad; los tipos de cada módulo (`Product`, `SaleOrder`, …) son alias de los suyos. Para cambiar la forma de una respuesta se edita **en el backend** y se ejecuta allí `pnpm contratos:generar`. Editar el archivo generado no sirve: `frescura.test.ts` lo detecta y la próxima generación lo pisa.
- **`price` y los `unitPrice` son `string | number`**, no `number`: los `Decimal` de Prisma llegan como cadena. Para convertir, `aNumero()` del contrato. `/reports` es la excepción y sí manda números.
- **Ningún texto de interfaz se escribe en un componente** (T4-04). Todo sale de `src/shared/i18n/es.ts` —el catálogo de referencia— y se pinta con `t()` / `tn()` de `useT()`; los mensajes de los esquemas Zod guardan **la clave** y los traduce `te()` en el campo. `en.ts` es un `Record` sobre las claves de `es.ts`, así que una traducción que falte **no compila**, y `src/tests/i18n/literales.test.ts` falla si vuelve a aparecer una cadena a mano en un nodo JSX, en una prop visible (`label`, `placeholder`, `title`, `aria-label`, `alt`, `summary`) o en un `toast`. Las fechas van por `shared/lib/fechas.ts`, que sigue al idioma. El porqué del motor propio, en [ADR 0007](../Stockly-B/docs/adr/0007-i18n-propio.md).

## CodeGraph

Este repositorio tiene además un `.claude/CLAUDE.md` con las instrucciones del índice CodeGraph. Ambos archivos se aplican.
