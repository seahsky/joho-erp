import { cn } from '../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use shimmer animation (default) or fallback to pulse */
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md',
        shimmer ? 'animate-shimmer' : 'animate-pulse bg-muted',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
