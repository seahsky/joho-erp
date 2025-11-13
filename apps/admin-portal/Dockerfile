# ========================================
# Stage 1: Dependencies
# ========================================
FROM node:20-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files for workspace resolution
COPY apps/admin-portal/package.json ./apps/admin-portal/
COPY packages/api/package.json ./packages/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# ========================================
# Stage 2: Builder
# ========================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY tsconfig.json ./

# Copy all workspace packages (needed for monorepo build)
COPY packages ./packages
COPY apps/admin-portal ./apps/admin-portal

# Build the admin portal and its dependencies
RUN pnpm turbo build --filter=admin-portal

# ========================================
# Stage 3: Runner
# ========================================
FROM node:20-alpine AS runner

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy workspace configuration for production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin-portal/package.json ./apps/admin-portal/
COPY packages/api/package.json ./packages/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-portal/.next ./apps/admin-portal/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-portal/public ./apps/admin-portal/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-portal/next.config.js ./apps/admin-portal/
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-portal/package.json ./apps/admin-portal/

# Copy shared packages dist (if they have build outputs)
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

# Switch to non-root user
USER nextjs

# Expose admin portal port
EXPOSE 3001

# Set working directory to admin portal
WORKDIR /app/apps/admin-portal

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["pnpm", "start"]
