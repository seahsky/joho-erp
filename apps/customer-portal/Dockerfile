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
COPY apps/customer-portal/package.json ./apps/customer-portal/
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
COPY apps/customer-portal ./apps/customer-portal

# Build the customer portal and its dependencies
RUN pnpm turbo build --filter=customer-portal

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
COPY apps/customer-portal/package.json ./apps/customer-portal/
COPY packages/api/package.json ./packages/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/apps/customer-portal/.next ./apps/customer-portal/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/customer-portal/public ./apps/customer-portal/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/customer-portal/next.config.js ./apps/customer-portal/
COPY --from=builder --chown=nextjs:nodejs /app/apps/customer-portal/package.json ./apps/customer-portal/

# Copy shared packages dist (if they have build outputs)
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

# Copy i18n messages
COPY --from=builder --chown=nextjs:nodejs /app/apps/customer-portal/messages ./apps/customer-portal/messages
COPY --from=builder --chown=nextjs:nodejs /app/apps/customer-portal/i18n ./apps/customer-portal/i18n

# Switch to non-root user
USER nextjs

# Expose customer portal port
EXPOSE 3000

# Set working directory to customer portal
WORKDIR /app/apps/customer-portal

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["pnpm", "start"]
