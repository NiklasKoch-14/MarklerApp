# Build stage — Angular kompilieren
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:prod

# Production stage — nginx serviert die App
FROM nginx:alpine

# nginx.conf als Template kopieren (BACKEND_URL wird zur Laufzeit ersetzt)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Angular-Build rein
COPY --from=build /app/dist/realestate-crm-frontend /usr/share/nginx/html

ENV PORT=80
EXPOSE 80

# envsubst ersetzt ${BACKEND_URL} und ${PORT} — nginx-Variablen wie $uri bleiben unberührt
CMD ["sh", "-c", "envsubst '${BACKEND_URL} ${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
