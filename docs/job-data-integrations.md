# Job-data integrations

This catalog records candidate sources, APIs, CLIs, MCP servers, and supporting references for the portfolio's job-data features. It is intentionally provider-agnostic: integrations must be selected per request, normalized server-side, and linked back to their original posting.

## Default selection policy

Choose the lowest-processing source that can satisfy the request without materially reducing accuracy:

1. Use a provider's structured, documented job API for its own inventory.
2. Use a maintained aggregator API when a cross-source search is required.
3. Use an MCP connector only as an interaction layer over an approved API; it must not duplicate or re-scrape data unnecessarily.
4. Use scraping, proxies, or browser automation only as an explicit fallback when no suitable structured source exists. Cache results, minimize fields and frequency, and respect provider terms and rate limits.

For every result, preserve `source`, `source_job_id` (when supplied), `source_url`, `retrieved_at`, and `posted_at`. Prefer the canonical employer or job-board URL as the apply link. Deduplicate on a stable source ID first, then on a conservative company/title/location/date heuristic.

## Candidate integrations

| Integration | Type | Recommended role | Default status |
| --- | --- | --- | --- |
| [Himalayas Remote Jobs API](https://himalayas.app/api) | Structured job API | Primary source for remote-only listings when its coverage fits the search. | Preferred |
| [TheirStack API](https://theirstack.com/en/docs/api-reference) | Structured job-data API | Cross-source search and enrichment after validating fields, limits, and pricing. | Preferred |
| [SerpApi Google Jobs API](https://serpapi.com/google-jobs-api) and [results endpoint](https://serpapi.com/google-jobs-results) | Search-results API | Broad discovery fallback when a source-native API cannot meet coverage. Query narrowly and cache. | Conditional |
| [Adzuna Job Search MCP](https://github.com/folathecoder/adzuna-job-search-mcp) | MCP server | Conversational access to Adzuna only if the server is reviewed and configured with the official Adzuna credentials. | Conditional |
| [JobSpy](https://github.com/speedyapply/JobSpy) | Python scraping library / CLI | Development-only or controlled fallback for supported boards. Do not make it the default production fetch path. | Fallback |
| [jobspy-api](https://github.com/rainmanjam/jobspy-api) | Self-hosted JobSpy HTTP API | Wrap JobSpy behind a single internal boundary if scraping is approved; adds operational overhead compared with a direct API. | Fallback |
| [Bright Data](https://docs.brightdata.com/introduction) | Web-data platform | Last-resort extraction where permission, budget, and compliance review are clear. | Opt-in only |
| [Merge](https://app.merge.dev/) | Unified HR/ATS integration platform | Candidate for authorized employer/ATS workflows; not the default public job-discovery source. | Evaluate per partner |
| [Skywork JobApply MCP listing](https://skywork.ai/skypage/en/jobapply-mcp-server-ai-engineer/1980506909136506880) | Third-party MCP listing | Discovery reference only until its publisher, permissions, data handling, and upstream source are verified. | Do not enable |
| [NoDesk FAQs](https://nodesk.jobcopilot.com/faq) | Editorial reference | Product/content research; not a structured integration. | Reference only |

## Local source snapshots

The following user-supplied archival references remain outside the repository and are useful during implementation research:

- `Remote Jobs API _ Himalayas.mhtml`
- `Google Jobs API - SerpApi.mhtml`
- `Google Jobs Results API - SerpApi.mhtml`
- `NoDesk - FAQs for Remote Jobs.mhtml`

Do not commit the archives unless licensing, size, and update ownership have been reviewed. Treat current provider documentation as authoritative over snapshots.

## Security and implementation requirements

- Store provider credentials only in deployment secrets or a local ignored `.env`; use `.env.example` for names only.
- Keep all provider calls server-side. Never ship a job-data API key in browser code, a public repository, screenshots, or logs.
- Give each integration a small adapter that emits the portfolio's normalized job schema. This keeps an MCP or provider swap from affecting the UI.
- Cache search responses with a short, provider-appropriate TTL; add rate limiting and retry only documented transient failures.
- Record source attribution and retrieval timestamp; surface stale data instead of silently presenting it as current.
- Before enabling any scraper, proxy, or third-party MCP, review its terms, privacy posture, requested permissions, costs, and operational ownership.

## Evaluation checklist for future references

Add a source only after capturing:

- the canonical docs URL and integration type;
- coverage, freshness, rate limits, authentication, and cost;
- whether the data is first-party, aggregated, or scraped;
- allowed use and attribution/apply-link requirements;
- its normalized-field mapping and deduplication behavior;
- a default tier: preferred, conditional, fallback, or reference-only.
