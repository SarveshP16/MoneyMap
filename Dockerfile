# MoneyMap is a static SPA (Vite build, no server-side code) — build it
# with Node, then serve the plain files with nginx. Same image works on
# the Pi later: just `docker buildx build --platform linux/arm64 ...`.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
