/** Standard estimates only. Source/effective-period review: docs/MPIA_M3_ACQUISITION_ESTIMATOR.md. */
export const MALAYSIAN_ACQUISITION_RULES = {
  version: "MY-ACQ-2026-10-29.v1",
  reviewedOn: "2026-10-29",
  amendmentSource: "https://www.hasil.gov.my/wp-content/uploads/Akta-Kewangan-2025-Akta-874.pdf",
  transfer: {
    effectiveFrom: "2019-01-01",
    unit: 100,
    bands: [
      { upTo: 100_000, dutyPerUnit: 1 },
      { upTo: 500_000, dutyPerUnit: 2 },
      { upTo: 1_000_000, dutyPerUnit: 3 },
      { upTo: Infinity, dutyPerUnit: 4 },
    ],
    source: "https://www.hasil.gov.my/wp-content/uploads/20240101-akta-setem-1949-akta-378.pdf",
    provision: "Stamp Act 1949, First Schedule item 32(a)",
  },
  legal: {
    effectiveFrom: "2023-07-15",
    firstBand: 500_000,
    firstRate: 0.0125,
    remainingRate: 0.01,
    minimum: 500,
    negotiationAbove: 7_500_000,
    source:
      "https://www.malaysianbar.org.my/cms/upload_files/document/Circular%20No%20185-2023.pdf",
    provision: "SRO 2023, First Schedule Table A / Third Schedule Table A",
  },
  loanStamp: {
    // Confirmed in the official consolidation as at 1 January 2024; not a new commencement date.
    confirmedInForceOn: "2024-01-01",
    unit: 1000,
    dutyPerUnit: 5,
    provision: "Stamp Act 1949, First Schedule items 22(1)(a), 27(a)(iii)",
  },
} as const;

export const ACQUISITION_ESTIMATE_EXCLUSIONS =
  "Excludes service tax (SST), legal disbursements, first-home exemptions, remissions, incentives and negotiated discounts. Valuation, registration, searches, consent, subsidiary loan documents and all other costs remain manual. This is a planning estimate, not a solicitor’s quotation or stamp-duty assessment.";

export const ACQUISITION_UNSUPPORTED_CASES =
  "Unsupported: non-citizens, companies, joint buyers, Sabah/Sarawak, commercial property, developer/HDA purchases, auctions, gifts, inherited transfers, unissued titles, Islamic or foreign-currency financing, refinancing and special loan/security structures.";
