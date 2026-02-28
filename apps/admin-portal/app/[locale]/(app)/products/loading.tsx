import { Skeleton, Card, CardContent } from "@joho-erp/ui";

export default function ProductsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" role="status" aria-label="Loading products">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Search and tabs */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 flex-1 max-w-sm" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="border-b px-4 py-3 flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-3 flex items-center gap-4" style={{ animationDelay: `${i * 50}ms` }}>
              <Skeleton className="h-10 w-10 rounded-md shrink-0" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
