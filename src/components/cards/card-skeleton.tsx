import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="paper-panel premium-outline flex h-full flex-col overflow-hidden rounded-[2rem] border border-primary/10 bg-card">
      <div className="h-36 animate-pulse bg-primary/12 sm:h-40 lg:h-44" />
      <div className="flex flex-1 flex-col justify-between p-5">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex flex-1 flex-col justify-center space-y-4 py-6">
          <Skeleton className="h-7 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
