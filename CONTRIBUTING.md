# Cómo contribuir a Stockly (frontend)

**La guía completa está en el repositorio hermano: [`Stockly-B/CONTRIBUTING.md`](../Stockly-B/CONTRIBUTING.md).**

Vive allí por lo mismo que `docs/`: cubre los dos repositorios y la carpeta que los contiene
no está bajo control de versiones. Si no tienes `Stockly-B` clonado al lado, clónalo antes
de planificar nada.

Este archivo existe para que GitHub tenga algo que enseñar en este repositorio, y para dejar
a mano lo que solo aplica aquí.

---

## Lo específico de este repositorio

**Antes de tocar la interfaz, lee [`docs/design-system.md`](docs/design-system.md).** No es
una guía de estilo opcional: varias de sus reglas hacen fallar `pnpm verify` si se incumplen
—una utilidad cruda de la paleta de Tailwind, un radio fuera de los tres permitidos, una
sombra que no sea uno de los dos tokens de elevación—.

La puerta de calidad, igual que en el backend, es local: **este proyecto no usa CI**
([ADR 0005](../Stockly-B/docs/adr/0005-sin-integracion-continua.md)).

```bash
pnpm verify           # check → lint → test:coverage → build
pnpm test:e2e:full    # Playwright en chromium y Mobile Chrome
```

`pnpm lint` debe terminar con **0 errores y 0 avisos**: cualquier aviso nuevo es una
regresión, no ruido de fondo. A diferencia del backend, aquí sí existe ese comando; allí la
comprobación estática es solo `pnpm check`.

**Nunca poner una contraseña real en `e2e/`.** Ese directorio está versionado y una fuga así
ya obligó a reescribir el historial (T0-06). Las credenciales salen del seed del backend y
son sobreescribibles por variables de entorno.
