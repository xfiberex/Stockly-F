# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Versión exacta, igual que en el backend: corepack rechaza rangos semver y con
# `@latest` el build deja de ser reproducible.
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Vite **incrusta** las variables `VITE_*` en el bundle al compilar: no se pueden
# cambiar después arrancando el contenedor con otro entorno. Por eso llega como
# argumento de build. El valor por defecto es una ruta relativa, que es lo que
# corresponde cuando nginx hace de proxy de la API en el mismo origen.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# `nginx:alpine` arranca el maestro como root para poder abrir el puerto 80 y baja los
# procesos de trabajo a `nginx`. No se fuerza `USER nginx` como en el backend (T1-21):
# aquí no se ejecuta código de la aplicación, solo se sirven archivos estáticos, y
# cambiarlo exige reasignar los directorios de caché y el puerto.
CMD ["nginx", "-g", "daemon off;"]
