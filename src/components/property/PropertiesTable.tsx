import { Link } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import type { PlaceholderProperty } from "@/lib/placeholder-data";

export function PropertiesTable({
  rows,
  caption = "Properties",
}: {
  rows: PlaceholderProperty[];
  caption?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{caption}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Asking Price</TableHead>
                <TableHead className="text-right">Net Yield</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Data Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.location}</TableCell>
                  <TableCell className="text-muted-foreground">{row.propertyType}</TableCell>
                  <TableCell className="text-right">{row.askingPrice}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.netYield ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.score ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/properties/$id" params={{ id: row.id }}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
