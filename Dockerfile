# Build frontend stage
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Copy frontend package files
COPY package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY . .

# Build the frontend app
RUN npm run build

# Build backend stage
FROM node:20-alpine AS backend-build

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app/server

# Copy backend package files
COPY server/package*.json ./

# Install backend dependencies
RUN npm ci

# Copy backend source code
COPY server/ .

# Build the backend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install nginx, supervisor, and runtime deps for better-sqlite3
RUN apk add --no-cache nginx supervisor

# Create nginx directories and data directory for SQLite
RUN mkdir -p /run/nginx /data

# Copy custom nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy built frontend assets from build stage
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Copy backend from build stage
WORKDIR /app/server
COPY --from=backend-build /app/server/dist ./dist
COPY --from=backend-build /app/server/node_modules ./node_modules
COPY --from=backend-build /app/server/package.json ./

# Copy supervisor config
COPY supervisord.conf /etc/supervisord.conf

# Expose port 80
EXPOSE 80

# Volume for SQLite database persistence
VOLUME ["/data"]

# Start supervisor (runs both nginx and node)
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
