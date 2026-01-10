FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment for build
ARG NUXT_PUBLIC_API_URL=http://server:5000/api/v1
ENV NUXT_PUBLIC_API_URL=$NUXT_PUBLIC_API_URL

# Build for production
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/.output /app/.output

# Set runtime environment
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start server
CMD ["node", ".output/server/index.mjs"]
