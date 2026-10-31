import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EvidenceFields } from "@/components/property/EvidenceFields";
import { type EvidenceEntry } from "@/lib/property/investment-evidence";
const entry: EvidenceEntry = {
  origin: "verified_actual",
  valueAtReview: 0,
  sourceLabel: "Unit invoice",
  sourceUrl: "https://example.test/invoice",
  notes: "<script>unsafe()</script>",
  observedOn: "2026-10-30",
  verifiedOn: "2026-10-30",
  estimate: null,
};
const render = (metadata: unknown, values = { expected_monthly_rent: 0 }) =>
  renderToStaticMarkup(
    createElement(EvidenceFields, { section: "properties", values, metadata, onChange: () => {} }),
  );
describe("M5 source presentation (SSR; not browser acceptance)", () => {
  it("shows zero, checked-by-user copy, safe source links and escaped notes", () => {
    const html = render({ version: 1, fields: { expected_monthly_rent: entry } });
    expect(html).toContain("Actual - checked by you");
    expect(html).toContain("MPIA has not authenticated");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("&lt;script&gt;unsafe()&lt;/script&gt;");
    expect(html).not.toContain("<script>unsafe()");
    expect(html).toContain("Value being supported:");
    expect(html).toContain("<strong>0</strong>");
  });
  it("does not present mismatched actual evidence as current", () => {
    const html = render(
      { version: 1, fields: { expected_monthly_rent: entry } },
      { expected_monthly_rent: 1 },
    );
    expect(html).toContain("Value changed - review source");
  });
  it("does not allow a user to select manufactured system provenance", () => {
    const html = render(null);
    expect(html).not.toContain('value="system_estimate"');
    expect(html).toContain('value="verified_actual"');
    expect(html).toContain("Evidence not recorded");
    expect(html).toContain("Use source in draft");
  });
  it("preserves malformed metadata as unavailable and withholds editing", () => {
    const html = render({ version: 2, fields: {} });
    expect(html).toContain("Evidence unavailable");
    expect(html).toContain("Existing sources have been preserved");
    expect(html).not.toContain("Use source in draft");
  });
});
