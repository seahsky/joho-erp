# ========================================
# Stage 1: Builder
# ========================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.json .npmrc ./

# CRITICAL: Copy all workspace source code BEFORE installing
# This ensures workspace symlinks resolve to complete packages with TypeScript source
COPY packages ./packages
COPY apps/admin-portal ./apps/admin-portal

# Install dependencies with BuildKit cache mount for faster rebuilds
# Workspace packages are now complete, so pnpm can create proper symlinks
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Accept build arguments for NEXT_PUBLIC_* environment variables
# These are embedded into the Next.js bundle at build time
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_API_URL

# Convert ARGs to ENV so Next.js build process can access them
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the admin portal and its dependencies using Turbo
# The NEXT_PUBLIC_* variables above will be embedded in the bundle
RUN pnpm turbo build --filter=admin-portal

# ========================================
# Stage 2: Runner
# ========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Set the port for admin portal
ENV PORT=3001

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone server and its dependencies
# Next.js standalone output includes everything needed to run
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-portal/.next/standalone ./

# Copy the static files (required for assets)
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-portal/.next/static ./apps/admin-portal/.next/static

# Copy public folder if it exists (for static assets)
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-portal/public ./apps/admin-portal/public

# Switch to non-root user
USER nextjs

# Expose admin portal port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the standalone server (not using pnpm anymore)
CMD ["node", "apps/admin-portal/server.js"]
