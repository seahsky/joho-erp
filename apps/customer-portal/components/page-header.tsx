import { H2, Muted, Skeleton, cn } from '@joho-erp/ui';

interface PageHeaderProps {
  /**
   * The main title of the page
   */
  title: string;
  /**
   * Optional subtitle/description
   */
  subtitle?: string;
  /**
   * Whether the header should be sticky (default: true)
   */
  sticky?: boolean;
  /**
   * Optional actions slot (e.g., buttons)
   */
  actions?: React.ReactNode;
  /**
   * Show loading skeleton state
   */
  isLoading?: boolean;
  /**
   * Additional className for the container
   */
  className?: string;
}

/**
 * Shared page header component for consistent styling across all authenticated pages.
 * Features:
 * - Sticky positioning by default
 * - Subtle bottom border gradient
 * - Optional actions slot
 * - Loading skeleton state support
 */
export function PageHeader({
  title,
  subtitle,
  sticky = true,
  actions,
  isLoading = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'bg-background z-10',
        sticky && 'sticky top-0',
        // Subtle gradient border effect from primary to transparent
        'border-b border-transparent',
        'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px',
        'after:bg-gradient-to-r after:from-transparent after:via-primary/20 after:to-transparent',
        'relative',
        className
      )}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-48 mb-2" />
                {subtitle !== undefined && <Skeleton className="h-4 w-64" />}
              </>
            ) : (
              <>
                <H2 className="text-2xl md:text-3xl">{title}</H2>
                {subtitle && <Muted className="mt-1">{subtitle}</Muted>}
              </>
            )}
          </div>
          {actions && !isLoading && (
            <div className="flex-shrink-0">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton version of PageHeader for loading states in page-level components
 */
export function PageHeaderSkeleton({
  hasSubtitle = true,
  sticky = true,
  className,
}: {
  hasSubtitle?: boolean;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <PageHeader
      title=""
      subtitle={hasSubtitle ? '' : undefined}
      sticky={sticky}
      isLoading={true}
      className={className}
    />
  );
}
