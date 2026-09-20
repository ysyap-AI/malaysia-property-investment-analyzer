import { Link } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AnalysisStatusBadge,
  PropertyStatusBadge,
} from "@/components/property/PropertyStatusBadge";
import { displayMoney, displayText, type PropertyRecord } from "@/lib/property/property-fields";

export function PropertiesTable({
  rows,
  caption = "Properties",
  onDelete,
}: {
  rows: PropertyRecord[];
  caption?: string;
  onDelete?: (property: PropertyRecord) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{caption}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Asking Price</TableHead>
                <TableHead className="text-right">Expected Rent</TableHead>
                <TableHead>Property Status</TableHead>
                <TableHead>Analysis</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No properties saved yet.
                  </TableCell>
                </TableRow>
              ) : null}
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium whitespace-nowrap text-foreground">
                    <Link to="/properties/$id" params={{ id: row.id }} className="hover:underline">
                      {row.project_name}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {displayText([row.city, row.state].filter(Boolean).join(", ") || null)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {displayText(row.property_type)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {displayMoney(row.asking_price)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                    {displayMoney(row.expected_monthly_rent)}
                  </TableCell>
                  <TableCell>
                    <PropertyStatusBadge status={row.property_status} />
                  </TableCell>
                  <TableCell>
                    <AnalysisStatusBadge status={row.analysis_status} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/properties/$id" params={{ id: row.id }}>
                        View
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/properties/$id/edit" params={{ id: row.id }}>
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                    {onDelete ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    ) : null}
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
