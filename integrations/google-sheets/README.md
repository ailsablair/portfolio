# Google Sheets job-import bridge

This Google Apps Script binds the portfolio's job-ingestion service to the shared spreadsheet:

- Spreadsheet ID: `1chFOAxvgOpuw72Ki4Ll92WvcRtlC-FACmhuc9gSbj5k`
- Reads: `Jobsites`
- Writes: `Application Tracking` only

## Guardrails implemented

- A job must match a Jobsite row by its name or source URL.
- A job is accepted only if its title matches one of that site's role titles (columns C:G), or its title/description matches one of its keywords (columns I:P).
- Jobs require a valid `postedAt` in the last 30 days, are sorted newest first, and are limited to **10 new rows per Jobsite per sync**.
- Existing posting URLs are not imported again.
- New rows use the requested mapping: `MMM d`, `Sourced`, title, company, salary, truncated description, and a clickable source URL.

## Install

1. Open the spreadsheet, choose **Extensions → Apps Script**, and replace the default files with [`Code.gs`](Code.gs) and [`appsscript.json`](appsscript.json).
2. In **Project Settings → Script Properties**, set:
   - `SPREADSHEET_ID` to the ID above.
   - `PORTFOLIO_SYNC_TOKEN` to a newly generated long random secret.
3. Run `verifyConfiguration` once from the Apps Script editor and authorize it. This confirms both expected sheets exist.
4. Deploy as a Web App. The portfolio backend sends only server-side HTTPS POST requests to that deployment URL; it must include the same token in the JSON body.

For a deployment reachable by an external portfolio backend, Apps Script's Web App access must allow those requests. Protect the endpoint with the token, rotate it when needed, and never put it in client-side code.

## Request contract

```json
{
  "token": "stored-only-in-server-secrets",
  "jobs": [
    {
      "jobsite": "Example jobs site",
      "sourceUrl": "https://example.com/jobs",
      "title": "Product Designer",
      "company": "Example Co.",
      "salary": "$100,000–$125,000",
      "description": "Full job description text",
      "url": "https://example.com/jobs/123",
      "postedAt": "2026-07-14T12:00:00Z"
    }
  ]
}
```

The caller is responsible for using the approved source adapters described in [`../../docs/job-data-integrations.md`](../../docs/job-data-integrations.md), requesting only each site's configured roles/keywords, and providing the original job-posting URL.
