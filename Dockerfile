FROM node:20-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json lerna.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci
COPY client client
COPY server server
RUN npm run build -w presight-client && npm run build -w presight-server \
    && npm prune --omit=dev

FROM node:20-trixie-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    DB_FILE=/data/presight.sqlite \
    CLIENT_DIST=/app/client/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
RUN mkdir -p /data && chown node:node /data
USER node
WORKDIR /app/server
EXPOSE 3001
VOLUME ["/data"]
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node dist/db/setup.js && node dist/index.js"]
