import { Skeleton } from "@joho-erp/ui";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation skeleton */}
      <div className="hidden md:block">
        <div className="h-16 border-b bg-card">
          <div className="container flex items-center justify-between h-full">
            <Skeleton className="h-8 w-32" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container py-8">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
