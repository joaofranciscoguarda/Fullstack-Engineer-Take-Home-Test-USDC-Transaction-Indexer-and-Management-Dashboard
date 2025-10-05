# =================================================================
# Stage 1: Development (Primary Target)
# =================================================================
FROM node:20-alpine AS development

# Install pnpm
RUN npm install -g pnpm

# Install development tools
RUN apk add --no-cache git

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev dependencies)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate --schema=src/database/prisma/schema.prisma

# Create a non-root user for development
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose ports for development (app + debugger)
EXPOSE 8080 9229

# Set environment for development
ENV NODE_ENV=development

# Run in development mode with hot reloading
CMD ["pnpm", "start:dev"]

# =================================================================
# Stage 2: Dependencies (for production builds)
# =================================================================
FROM node:20-alpine AS dependencies

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# =================================================================
# Stage 3: Builder (for production builds)
# =================================================================
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate --schema=src/database/prisma/schema.prisma

# Build the application
RUN pnpm build

# =================================================================
# Stage 4: Production (Secondary Target)
# =================================================================
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application and Prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/database/prisma/schema.prisma ./src/database/prisma/schema.prisma
COPY --from=builder /app/src/database/prisma/migrations ./src/database/prisma/migrations

# Create a non-root user for production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
RUN chown -R nestjs:nodejs /app
USER nestjs

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Run migrations and start application
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main"]

