import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-4 w-[400px]" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="space-y-2">
            <Skeleton className="h-5 w-[150px]" />
            <Skeleton className="h-4 w-[250px]" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-full max-w-sm" />
              <Skeleton className="h-10 w-[180px]" />
            </div>
            <div className="rounded-md border">
              <div className="h-10 border-b bg-muted/50 px-4 flex items-center gap-4">
                 {[...Array(6)].map((_, i) => (
                   <Skeleton key={i} className="h-4 w-full" />
                 ))}
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 border-b px-4 flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
