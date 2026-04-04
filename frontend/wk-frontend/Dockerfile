# --- Stage 1: build the Vite/React SPA ---
FROM node:20 AS build
WORKDIR /app

# Install dependencies (package-lock.json pins versions for reproducible builds).
COPY package*.json ./
RUN npm install

# Copy sources and produce static assets in /app/dist.
COPY . .
RUN npm run build

# --- Stage 2: serve static files with nginx ---
FROM nginx:alpine
# SPA routing: try files then fall back to index.html (see nginx.conf in this folder).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
