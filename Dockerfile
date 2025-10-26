# =========================
# Stage 1: Build the frontend
# =========================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy and install frontend dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source code
COPY frontend/ ./

# Build the frontend
RUN npm run build


# =========================
# Stage 2: Backend + NGINX
# =========================
FROM node:18-alpine

WORKDIR /app

# Install nginx for serving frontend
RUN apk add --no-cache nginx

# Copy backend package files and install dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source code
COPY backend/ ./

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# Create nginx config for serving frontend + proxying API
RUN echo '\
server { \
    listen 80; \
    location / { \
        root /var/www/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://localhost:5000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_cache_bypass $http_upgrade; \
    } \
    location /socket.io/ { \
        proxy_pass http://localhost:5000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_cache_bypass $http_upgrade; \
    } \
} \
' > /etc/nginx/conf.d/default.conf

# Create uploads directory
RUN mkdir -p uploads

# Expose ports
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# Start backend (Node.js) and NGINX
CMD nginx -g "daemon off;" & node server.js
