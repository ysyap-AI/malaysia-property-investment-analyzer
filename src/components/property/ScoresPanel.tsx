import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePropertyAnalysis } from "@/hooks/use-property-analysis";

export function ScoresPanel({ propertyId }: { propertyId: string }) {
  const { invest, confidence, isLoading } = usePropertyAnalysis(propertyId);
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const warn = invest.overall_score !== null && invest.overall_score >= 55 && confidence.score < 60;

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle className="size-4 text-warning" /> Two separate scores — never read one without the other
        </p>
        <p className="mt-1 text-muted-foreground">
          The Investment Score rates the numbers you entered. Data Confidence rates how reliable those numbers are.
          A strong investment score with poor data confidence does <strong>not</strong> mean a confirmed good investment.
        </p>
        {warn ? (
          <p className="mt-2 font-medium text-warning">
            This property scores well, but its data confidence is low. Verify the inputs below before relying on the score.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Investment Score (Base case)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-3xl font-semibold">
              {invest.overall_score === null ? "Not available" : `${invest.overall_score} / 100`}
            </p>
            <p className="text-muted-foreground">
              {invest.recommendation?.label ?? "Not enough data for a score"} · {Math.round(invest.data_coverage * 100)}% of scoring weight has data
            </p>
            {invest.notes.map((n) => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}
            <ul className="space-y-2 border-t border-border pt-3">
              {invest.categories.map((c) => (
                <li key={c.key}>
                  <div className="flex justify-between gap-2 font-medium">
                    <span>{c.label}</span>
                    <span>{c.raw_score === null ? "—" : `${c.raw_score}/100`} · weight {c.weight}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.explanation}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Data Confidence</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-3xl font-semibold">{confidence.score} / 100</p>
            <p className="text-muted-foreground">{confidence.band.label}</p>
            <ul className="space-y-2 border-t border-border pt-3">
              {confidence.factors.map((f) => (
                <li key={f.key}>
                  <div className="flex justify-between gap-2 font-medium">
                    <span>{f.label}</span>
                    <span className={f.deduction > 0 ? "text-destructive" : "text-muted-foreground"}>
                      {f.status === "not-available-in-phase" ? "Not assessed yet" : f.deduction > 0 ? `−${f.deduction}` : "No deduction"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.explanation}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
