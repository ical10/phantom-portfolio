import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  rows?: number;
};

export function TokenTableSkeleton({ rows = 4 }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Token</TableHead>
          <TableHead className="w-28 text-right">Price</TableHead>
          <TableHead className="w-32 text-right">Amount</TableHead>
          <TableHead className="w-28 text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-14" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-3.5 w-16" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-3.5 w-20" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-3.5 w-16" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
