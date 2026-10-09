FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
RUN npm install -g opencode-ai && mkdir -p /home/node/.local/share/opencode
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && chown -R node:node /app /home/node/.local
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
