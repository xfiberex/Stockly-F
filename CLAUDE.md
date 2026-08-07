# Stockly — Frontend

SPA de React 19 sobre Vite. El backend vive en un repositorio hermano, `Stockly-B`, que se clona al lado de este.

```
01-Stockly/
├── Stockly-B/   ← API + documentación viva del proyecto
└── Stockly-F/   ← este repositorio
```

## Documentación viva

Está en el repositorio del backend, en `Stockly-B/docs/`, y cubre **los dos repositorios**:

- `docs/ROADMAP.md` — 100 tareas con dependencias, progreso y métricas. La fuente de verdad del trabajo pendiente.
- `docs/INFORME-AUDITORIA.md` — los hallazgos que justifican cada tarea.
- `docs/README-proyecto.md` — visión de conjunto y arranque.

Si no tienes clonado `Stockly-B`, esos documentos no están en disco: clónalo antes de planificar nada.

**Al cerrar una tarea, anótala en el ROADMAP**, aunque el cambio sea de este repositorio.

## Verificación: sin CI, todo en local

Este proyecto **no usa CI**. No hay GitHub Actions ni pipeline de ningún proveedor, y no deben proponerse: se descartaron deliberadamente el 2026-08-06. Por la misma razón, `playwright.config.ts` no depende de `process.env.CI`. La puerta de calidad es un comando local:

```bash
pnpm verify
```

Encadena `check → lint → test:coverage → build`. **Está en verde** desde el 2026-08-07 (T1-09): `pnpm lint` debe terminar con 0 errores y 0 avisos, así que cualquier aviso nuevo es una regresión, no ruido de fondo.

El E2E de Playwright (`pnpm test:e2e`) necesita backend y base de datos levantados a mano; hacerlo reproducible es la tarea T1-24.

## Convenciones

- Gestor de paquetes: **pnpm 11.2.2** (fijado en `packageManager`). No usar npm ni yarn.
- Comentarios y documentación **en español**, como el resto del código.
- Las credenciales del E2E salen del seed del backend y son sobreescribibles por variables de entorno. **Nunca poner una contraseña real** en `e2e/`: ese directorio está versionado, y una fuga así ya obligó a reescribir el historial (tarea T0-06).

## CodeGraph

Este repositorio tiene además un `.claude/CLAUDE.md` con las instrucciones del índice CodeGraph. Ambos archivos se aplican.
