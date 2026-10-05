# Cómo contribuir a Stockly (frontend)

**La guía completa está en el repositorio hermano:
[`Stockly-B/CONTRIBUTING.md`](https://github.com/xfiberex/Stockly-B/blob/main/CONTRIBUTING.md)** —puerta
de calidad, CI, orden de subida, commits y cómo se cierra una tarea—. Vive allí, como el resto de
la documentación, porque cubre los dos repositorios y la carpeta que los contiene no está bajo
control de versiones. Si no tienes `Stockly-B` clonado al lado, clónalo antes de planificar nada.

## Lo específico de este repositorio

```bash
pnpm verify           # check → lint → test:coverage → build → auditoria
pnpm test:e2e:full    # Playwright en chromium y Mobile Chrome
```

- **Antes de tocar la interfaz, [`docs/design-system.md`](docs/design-system.md).** No es una guía
  de estilo opcional: varias de sus reglas hacen fallar `pnpm verify`.
- **`pnpm lint` termina con 0 errores y 0 avisos.** Un aviso nuevo es una regresión.
- **Los tipos de las respuestas de la API no se escriben aquí.**
  `src/shared/contratos/api.generated.ts` es una copia de `Stockly-B/src/contratos/api.ts`; se
  cambia allí y se regenera con `pnpm contratos:generar` **en el backend**.
- **Un cambio de contrato se sube primero al backend**: la CI de aquí clona su `main`.
- **Nunca una contraseña real en `e2e/`.** Está versionado, y una fuga así ya obligó a reescribir
  el historial.
