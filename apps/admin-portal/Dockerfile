# ========================================
# Stage 1: Builder
# ========================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.json .npmrc ./

# Copy all package.json files for workspace resolution
COPY apps/admin-portal/package.json ./apps/admin-portal/
COPY packages/api/package.json ./packages/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies with BuildKit cache mount for faster rebuilds
# This creates proper symlinks for the current filesystem
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy all workspace source code
COPY packages ./packages
COPY apps/admin-portal ./apps/admin-portal

# Build the admin portal and its dependencies using Turbo
RUN pnpm turbo build --filter=admin-portal

# Deploy to isolated directory with all dependencies properly resolved
# This creates a production-ready bundle with no symlink issues
RUN pnpm --filter=admin-portal deploy --prod /app/deploy/admin-portal

# ========================================
# Stage 2: Runner
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

# Copy the deployed package from builder
# This includes all dependencies properly resolved without symlink issues
COPY --from=builder --chown=nextjs:nodejs /app/deploy/admin-portal ./

# Switch to non-root user
USER nextjs

# Expose admin portal port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["pnpm", "start"]
