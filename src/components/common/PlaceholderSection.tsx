import { Construction } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderSection({
  title,
  description = "Not implemented in Phase 1. Reserved for a later phase.",
  items = [],
}: {
  title: string;
  description?: string;
  items?: string[];
}) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Construction className="size-4 text-warning" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {items.length > 0 ? (
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-border" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
