# Debian instead of alpine: the Prisma query engine checked in under
# src/generated (libquery_engine-debian-openssl-3.0.x.so.node) is a glibc
# binary, which a musl-based runtime cannot dlopen.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# tsconfig.json extends ../infra/tooling/tsconfig.base.json, a path one
# directory above this build context, so the file never reaches the image and
# tsc would fall back to its own defaults. The shared compiler options are
# written at the exact path the extends reference resolves to
# (/app/tsconfig.json -> /infra/tooling/tsconfig.base.json) to keep the image
# compile identical to the host one.
COPY <<'EOF' /infra/tooling/tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true
  }
}
EOF
RUN npm run build
# tsc emits nothing for the checked-in Prisma client (plain .js + .d.ts), and
# the compiled service resolves it relative to its own output directory, so the
# client tree is copied next to the emitted code before the runtime stage runs.
RUN mkdir -p dist/src/generated && cp -r src/generated/. dist/src/generated/

FROM node:22-bookworm-slim AS runtime
# The Prisma query engine links against OpenSSL and picks its variant by
# running the `openssl` CLI; the slim base image ships neither, so without
# this the client falls back to the wrong engine name and cannot dlopen.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
