# Stage 1: Build
FROM node:22-bullseye AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run
FROM node:22-bullseye

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
RUN npm install --omit=dev

# Cài thư viện hệ thống cho TensorFlow
RUN apt-get update && apt-get install -y libc6 libgcc1 libstdc++6

EXPOSE 3000

CMD ["node", "dist/index.js"]