# Malaysia Property Investment Analyzer — Engineering Rules

## Project Mission

Build a reliable Malaysia-focused residential property investment research system.

The system must combine:

- deterministic financial analysis
- transparent scoring
- evidence-based property research
- risk identification
- data-confidence assessment
- AI-assisted explanation

Financial accuracy, traceability and maintainability are more important than rapid feature generation.


# Architecture

The application has three conceptual engines.

## Engine A — Financial Calculation Engine

Financial calculations must be deterministic.

AI must never calculate or modify:

- acquisition cost
- operating expenses
- loan instalments
- gross rental yield
- yield on total cost
- NOI
- net rental yield
- monthly cash flow
- annual cash flow
- cash-on-cash return
- break-even occupancy
- scenario results

Financial formulas should exist in one authoritative calculation layer.

Do not duplicate financial formulas inside React/UI components.


## Engine B — Investment Scoring Engine

Investment scoring must use explicit configurable rules.

AI must never arbitrarily assign numerical scores.

Weights, thresholds and recommendation rules should be configurable where practical.


## Engine C — AI Analysis Engine

AI may explain:

- financial results
- strengths
- weaknesses
- risks
- missing information
- due-diligence requirements
- negotiation considerations

AI must not change underlying financial values or deterministic scores.


# Missing Data

Never silently convert unknown financial data to zero.

Use explicit states such as:

- Verified
- User Entered
- Estimated
- Listing Data
- Missing / Not Verified

If required data is unavailable, return an incomplete/unavailable result where appropriate.

Do not manufacture a result by assuming missing values are zero.


# Data Integrity

Never fabricate:

- property transactions
- rental amounts
- occupancy rates
- amenities
- expatriate population numbers
- sale evidence
- legal verification

Asking prices are not transaction prices.

Advertised rents are not verified achieved rents.


# Security

Each property belongs to one authenticated user.

Users must not be able to:

- view
- update
- delete

another user's property data.

Database security must not depend only on frontend filtering.

Use Supabase Row Level Security.

Never expose private API keys in frontend code.


# Development Discipline

Implement one feature at a time.

For every significant change:

1. Understand the requested scope.
2. Inspect existing relevant code.
3. Implement only the requested functionality.
4. Add or update automated tests.
5. Run relevant tests.
6. Run regression tests.
7. Report files changed.
8. Report tests executed.
9. Report failures or remaining risks.

Do not rewrite unrelated working modules.


# Testing

Automated tests are mandatory for financial calculations.

Tests must cover:

- normal cases
- boundary cases
- missing-data cases
- zero values
- invalid input where applicable

Financial-engine changes must not be accepted unless tests pass.


# Financial Metrics

Keep the following distinct:

- Gross Rental Yield
- Net Rental Yield
- Yield on Total Cost
- Cash-on-Cash Return
- Capital Appreciation
- Total Investment Return

Never relabel one metric as another.


# Phase Control

Current development priority:

PHASE 1

Do not implement Phase 2 or later functionality unless explicitly requested.

Phase 2 includes:

- geocoding
- maps
- nearby amenities
- transport
- external location research

Phase 3 includes:

- rental market data
- sale market data
- automated external property-data integrations

Phase 4 includes:

- AI investment interpretation


# Regression Protection

Before finishing a task:

Run existing tests.

If an unrelated existing test fails because of the change:

investigate the regression before completing the task.

Never remove a failing test simply to make the build pass unless the test itself is proven incorrect.


# Communication

The project owner has limited coding knowledge.

Explain important technical issues in plain English.

When reporting a problem include:

- what is wrong
- why it matters
- what was changed
- what tests were performed
- whether anything remains unresolved
