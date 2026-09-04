# Engine B — Scoring (not implemented)

Reserved for Phase 1 steps 8–9. Imports finance *results* only, never raw inputs.

Planned modules: `metricScores.ts`, `investmentScore.ts`, `dataConfidence.ts`,
`riskFlags.ts`.

Every score must return its reasoning (metric, raw value, band matched, points,
weight). AI never produces a number.
