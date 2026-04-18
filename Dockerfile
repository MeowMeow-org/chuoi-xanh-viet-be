FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN npm ci --omit=dev

# Prisma client was generated in the builder (`npm run build`). The runner only
# installs production deps, so `prisma`/`dotenv` are missing and
# `npx prisma generate` would fail loading prisma.config.ts.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/docs ./src/docs

EXPOSE 8000

CMD ["node", "dist/server.js"]
