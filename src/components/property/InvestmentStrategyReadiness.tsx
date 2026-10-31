import { usePropertyAnalysis } from "@/hooks/use-property-analysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Read-only requirements disclosure; no suitability rules, new metrics or writes. */
export function InvestmentStrategyReadiness({
  propertyId,
  draftOpen,
  confirmationPending,
}: {
  propertyId: string;
  draftOpen: boolean;
  confirmationPending: boolean;
}) {
  const analysis = usePropertyAnalysis(propertyId);
  const unavailable = !analysis.availability.current || confirmationPending;
  const status = (available: boolean) =>
    unavailable
      ? "Unavailable — saved information is loading, failed or awaiting confirmation"
      : available
        ? "Available from saved inputs"
        : "Missing or invalid required inputs";
  const metrics = [
    ["Gross rental yield", analysis.returns.grossRentalYield],
    ["Yield on total cost", analysis.returns.yieldOnTotalCost],
    ["Net operating income", analysis.returns.netOperatingIncome],
    ["Net rental yield", analysis.returns.netRentalYield],
    ["Monthly cash flow", analysis.returns.monthlyCashFlow],
    ["Annual cash flow", analysis.returns.annualCashFlow],
    ["Initial cash invested", analysis.returns.initialCashInvested],
    ["Cash-on-cash return", analysis.returns.cashOnCashReturn],
    ["Financed break-even occupancy", analysis.returns.financedBreakEvenOccupancy],
  ] as const;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Investment Strategy Readiness</CardTitle>
        <CardDescription>
          This panel shows existing rental-analysis requirements. Open the Strategies tab for
          independent Keep, Flip and Hybrid projections, sources and investor targets.
          {draftOpen
            ? " Uses saved inputs, not your open acquisition draft."
            : " Uses saved inputs."}{" "}
          Available financial analysis describes entered assumptions, not verified market evidence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <h3 className="font-semibold">Buy to Keep</h3>
          <p>
            Rental amount: {status(analysis.returns.potentialAnnualRent.status === "ok")}. Rent
            source and verification status must be reviewed separately in the property information.
          </p>
          <p>
            Financing and debt service: {status(analysis.scenarios.base.annualDebtService !== null)}
            . Review loan amount or LTV, interest rate, tenure, selected instalment and bank quote
            in Financing. Missing financing is not a confirmed cash purchase.
          </p>
          <p>
            Complete operating costs:{" "}
            {status(
              analysis.scenarios.base.expensesMissingCount === 0 &&
                analysis.scenarios.base.annualOperatingExpenses !== null,
            )}
            . Cash flow depends on rent, vacancy assumptions, operating expenses and debt service.
          </p>
          <details>
            <summary className="cursor-pointer rounded focus-visible:outline focus-visible:outline-2">
              Existing financial analysis availability
            </summary>
            <dl className="mt-2 space-y-2">
              {metrics.map(([label, metric]) => (
                <div key={label} className="grid gap-1 sm:grid-cols-2">
                  <dt>{label}</dt>
                  <dd>{status(metric.status === "ok")}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2">
              View Summary, Scores and Scenarios for the existing analysis and assumptions. Cash
              flow is before personal rental-income tax. Personal capital, carrying reserves and
              affordability assessment are not implemented here.
            </p>
          </details>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Buy to Flip</h3>
          <p>
            Market-value evidence:{" "}
            {unavailable
              ? "Unavailable while saved information is unresolved."
              : analysis.property?.bank_valuation != null
                ? "A bank valuation amount is recorded. Its source, date and comparability have not been evaluated for resale."
                : "Missing supported market-value evidence."}{" "}
            Asking price or a bare bank valuation cannot establish a supported purchase discount.
          </p>
          <p>
            Still required: attributed valuation or comparable transactions, condition and
            adjustment evidence, acquisition/disposal dates, preparation and holding periods,
            vacancy and carrying budgets.
          </p>
          <p>
            Enter the resale price, holding period, itemised exit costs and manual disposal-tax
            estimate in the Strategies tab. It calculates supported financing balances, final sale
            proceeds and investor profit. Initial holding cost remains an acquisition budget and
            must exclude the projected holding months to prevent overlap.
          </p>
          <p>
            Not yet implemented: automatic resale valuation, independent authentication of sources
            or automatic tax classification. Review the basis for each manual forecast.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Hybrid</h3>
          <p>
            Set Hybrid's own horizon, non-rental lead-in, occupancy, resale forecast, exit costs and
            targets in the Strategies tab. Its independent rental-plus-sale cash flows require both
            rental and resale evidence; it does not average the other strategies.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
