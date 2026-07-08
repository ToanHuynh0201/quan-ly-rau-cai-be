# ---------- Stage 1: Build ----------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
# --ignore-scripts: tránh chạy `prepare: husky` (không có .git/.husky trong build context)
RUN npm ci --ignore-scripts

COPY prisma.config.ts ./
COPY prisma ./prisma
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npx prisma generate && npm run build

# ---------- Stage 2: Production ----------
FROM node:22-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# --ignore-scripts: tránh chạy `prepare: husky` (husky là devDependency)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
