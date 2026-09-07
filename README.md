# Property Pro Malaysia

PROJECT NAME

Malaysia Property Investment Analyzer

PROJECT PURPOSE

Build a professional web application that helps investors evaluate Malaysian residential rental properties.

The application will eventually combine:

1. Property financial analysis

2. Location intelligence

3. Property market evidence

4. Risk assessment

5. Data-confidence assessment

6. AI-assisted explanation

However, development MUST happen in phases.

The attached Master Project Specification is the source of truth.

DO NOT attempt to implement the complete specification now.

==================================================

PERMANENT DEVELOPMENT RULES

==================================================

1. Build one module at a time.

2. Do not modify unrelated working functionality when implementing a new module.

3. Financial calculations must be deterministic.

4. AI must never calculate or modify financial numbers.

5. Investment scoring must use explicit configurable rules.

6. AI must never arbitrarily create numerical investment scores.

7. Missing values must never silently become zero.

8. Unknown important information must be represented as:

   Missing / Not Verified.

9. Clearly distinguish:

   - Verified

   - User Entered

   - Estimated

   - Listing Data

   - Missing / Not Verified

   - AI Generated Observation

10. Financial calculation logic must be stored separately from UI components.

11. Scoring logic must be stored separately from financial calculation logic.

12. Recommendation rules must be stored separately from AI analysis.

13. Important thresholds and weights must be configurable.

14. Do not scatter financial formulas throughout UI components.

15. Do not expose secret API keys in frontend code.

16. External APIs must later be called securely from server-side functions where appropriate.

17. Every property record must belong to an authenticated user.

18. Users must not be able to access another user's properties.

19. Security must not depend only on frontend filtering.

20. Use database-level access controls such as Supabase Row Level Security.

21. Do not fabricate property data.

22. Do not fabricate rental rates.

23. Do not fabricate transaction prices.

24. Do not fabricate occupancy rates.

25. Do not fabricate expatriate numbers.

26. Do not fabricate amenities.

27. Asking-price listings must never be treated as confirmed transactions.

28. Every important externally retrieved item must eventually retain:

    - source

    - retrieval date

    - verification status

    - confidence

29. Create automated tests for financial formulas.

30. Before implementing a new module:

    preserve all passing tests from previous modules.

31. Do not rewrite the entire application to solve a local problem.

32. Use clear names that a non-programmer can understand.

33. Explain important implementation decisions in plain English.

34. If a requirement is ambiguous, preserve the safest interpretation and tell me what assumption was made.

35. Do not start Phase 2 functionality until Phase 1 is explicitly declared stable.

==================================================

APPLICATION ARCHITECTURE

==================================================

Keep these conceptual engines separate:

ENGINE A

Financial Calculation Engine

Purpose:

Perform deterministic financial calculations.

Examples:

- acquisition cost

- loan instalment

- gross rental yield

- net rental yield

- NOI

- monthly cash flow

- annual cash flow

- cash-on-cash return

- break-even occupancy

- scenario calculations

ENGINE B

Investment Scoring Engine

Purpose:

Apply transparent configurable investment rules.

AI must not determine numerical scores.

ENGINE C

AI Analysis Engine

Purpose:

Explain completed calculations, scores, risks and evidence.

ENGINE C WILL NOT BE IMPLEMENTED IN PHASE 1.

==================================================

PHASE 1 ONLY

==================================================

Phase 1 will eventually include:

- Authentication

- Property database

- Manual property entry

- Acquisition costs

- Operating expenses

- Financing

- Financial calculations

- Bear/Base/Bull scenarios

- Investment scoring

- Data-confidence scoring

- Critical financial risk flags

- Deterministic recommendation

- Property summary dashboard

DO NOT IMPLEMENT YET:

- Google Maps

- OpenStreetMap

- geocoding

- nearby amenities

- public transport research

- rental comparable APIs

- sale comparable APIs

- property portal scraping

- automatic web research

- AI investment analysis

- PDF generation

- document extraction

- portfolio tracking

- alerts

- subscriptions/payments

==================================================

FIRST TASK

==================================================

DO NOT build the app yet.

First produce a proposed Phase 1 architecture containing:

1. Frontend architecture

2. Backend architecture

3. Database architecture

4. Authentication architecture

5. Financial calculation architecture

6. Scoring architecture

7. Configuration architecture

8. Testing architecture

9. Suggested folder structure

10. Phase 1 implementation sequence

For each major decision explain it in plain English.

Do not write implementation code yet.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5b49b85b-5038-4893-92cf-c9772e69f9aa).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
