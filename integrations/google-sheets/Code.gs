/**
 * Bound Google Apps Script for the portfolio job-import workflow.
 *
 * Configure Script Properties before deploying:
 * - PORTFOLIO_SYNC_TOKEN: a long random value used by the portfolio backend
 * - SPREADSHEET_ID: 1chFOAxvgOpuw72Ki4Ll92WvcRtlC-FACmhuc9gSbj5k
 */

const APPLICATION_SHEET = 'Application Tracking';
const JOBSITES_SHEET = 'Jobsites';
const MAX_NEW_ROWS_PER_JOBSITE_PER_RUN = 10;
const MAX_DESCRIPTION_LENGTH = 1_500;
const MAX_POSTING_AGE_DAYS = 30;

const TRACKING_COLUMNS = Object.freeze({
  importedDate: 0,
  status: 1,
  title: 2,
  company: 3,
  salary: 4,
  description: 5,
  url: 6,
});

/** Receives normalized jobs from the portfolio's server-side ingestion service. */
function doPost(event) {
  try {
    const payload = JSON.parse(event.postData && event.postData.contents || '{}');
    assertAuthorized_(payload.token);

    if (!Array.isArray(payload.jobs)) {
      throw new Error('Expected a JSON body with a jobs array.');
    }

    const spreadsheet = SpreadsheetApp.openById(requiredProperty_('SPREADSHEET_ID'));
    const jobsiteRules = readJobsiteRules_(spreadsheet);
    const existingUrls = readExistingUrls_(spreadsheet);
    const eligibleJobs = selectEligibleJobs_(payload.jobs, jobsiteRules, existingUrls);
    const imported = appendJobs_(spreadsheet, eligibleJobs);

    return json_({
      ok: true,
      imported: imported.length,
      byJobsite: countBy_(imported, 'jobsite'),
      rejected: payload.jobs.length - eligibleJobs.length,
    });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

/** Lets an authorized administrator validate the configured sheets from the editor. */
function verifyConfiguration() {
  const spreadsheet = SpreadsheetApp.openById(requiredProperty_('SPREADSHEET_ID'));
  const rules = readJobsiteRules_(spreadsheet);
  const applicationSheet = requiredSheet_(spreadsheet, APPLICATION_SHEET);
  Logger.log(JSON.stringify({ jobsites: rules.length, applicationRows: applicationSheet.getLastRow() }));
}

function readJobsiteRules_(spreadsheet) {
  const sheet = requiredSheet_(spreadsheet, JOBSITES_SHEET);
  const firstDataRow = firstDataRow_(sheet, 'Site');
  const lastRow = sheet.getLastRow();
  if (lastRow < firstDataRow) return [];

  const values = sheet.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, 18).getDisplayValues();
  const richText = sheet.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, 1).getRichTextValues();

  return values.map((row, index) => ({
    name: normalize_(row[0]),
    url: normalize_(richText[index][0].getLinkUrl() || row[0]),
    roles: row.slice(2, 7).map(normalize_).filter(Boolean),
    keywords: row.slice(8, 16).map(normalize_).filter(Boolean),
  })).filter(rule => rule.name || rule.url);
}

function selectEligibleJobs_(jobs, rules, existingUrls) {
  const countByJobsite = {};
  return jobs
    .map(normalizeJob_)
    .filter(job => job.url && job.postedAt && isRecent_(job.postedAt) && !existingUrls.has(job.url))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
    .filter(job => {
      const rule = findJobsiteRule_(job, rules);
      if (!rule || !matchesRule_(job, rule)) return false;

      const key = rule.name || rule.url;
      countByJobsite[key] = countByJobsite[key] || 0;
      if (countByJobsite[key] >= MAX_NEW_ROWS_PER_JOBSITE_PER_RUN) return false;
      countByJobsite[key] += 1;
      job.jobsite = key;
      return true;
    });
}

function normalizeJob_(job) {
  return {
    jobsite: normalize_(job.jobsite || job.source),
    sourceUrl: normalize_(job.sourceUrl),
    title: String(job.title || '').trim(),
    company: String(job.company || '').trim(),
    salary: String(job.salary || '').trim(),
    description: String(job.description || '').trim(),
    url: String(job.url || '').trim(),
    postedAt: toSortableDate_(job.postedAt),
  };
}

function findJobsiteRule_(job, rules) {
  return rules.find(rule =>
    (job.jobsite && normalize_(rule.name) === job.jobsite) ||
    (job.sourceUrl && normalize_(rule.url) === job.sourceUrl)
  );
}

function matchesRule_(job, rule) {
  const title = normalize_(job.title);
  const description = normalize_(job.description);
  const roleMatches = rule.roles.some(role => title.includes(role));
  const keywordMatches = rule.keywords.some(keyword =>
    title.includes(keyword) || description.includes(keyword)
  );
  return roleMatches || keywordMatches;
}

function appendJobs_(spreadsheet, jobs) {
  if (!jobs.length) return [];
  const sheet = requiredSheet_(spreadsheet, APPLICATION_SHEET);
  const timeZone = spreadsheet.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  const importedDate = Utilities.formatDate(new Date(), timeZone, 'MMMM d');
  const startRow = Math.max(sheet.getLastRow() + 1, 2);
  const values = jobs.map(job => [
    importedDate,
    'Sourced',
    job.title,
    job.company,
    job.salary,
    truncate_(job.description),
    job.url,
  ]);
  sheet.getRange(startRow, 1, values.length, 7).setValues(values);
  sheet.getRange(startRow, 7, values.length, 1).setRichTextValues(jobs.map(job => [
    SpreadsheetApp.newRichTextValue().setText(job.url).setLinkUrl(job.url).build(),
  ]));
  return jobs;
}

function readExistingUrls_(spreadsheet) {
  const sheet = requiredSheet_(spreadsheet, APPLICATION_SHEET);
  if (sheet.getLastRow() < 2) return new Set();
  const range = sheet.getRange(2, TRACKING_COLUMNS.url + 1, sheet.getLastRow() - 1, 1);
  const values = range.getDisplayValues();
  const richText = range.getRichTextValues();
  return new Set(values.map((row, index) => richText[index][0].getLinkUrl() || row[0]).filter(Boolean));
}

function assertAuthorized_(token) {
  if (!token || token !== requiredProperty_('PORTFOLIO_SYNC_TOKEN')) {
    throw new Error('Unauthorized.');
  }
}

function requiredProperty_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error(`Missing Script Property: ${name}`);
  return value;
}

function requiredSheet_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error(`Missing required sheet: ${name}`);
  return sheet;
}

function normalize_(value) {
  return String(value || '').trim().toLowerCase();
}

function toSortableDate_(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function isRecent_(isoDate) {
  const cutoff = Date.now() - MAX_POSTING_AGE_DAYS * 24 * 60 * 60 * 1000;
  return new Date(isoDate).getTime() >= cutoff;
}

function firstDataRow_(sheet, expectedHeader) {
  const firstColumn = sheet.getRange(1, 1, sheet.getLastRow(), 1).getDisplayValues().flat();
  const headerIndex = firstColumn.findIndex(value => String(value).trim() === expectedHeader);
  return headerIndex === -1 ? 2 : headerIndex + 2;
}

function truncate_(value) {
  return value.length <= MAX_DESCRIPTION_LENGTH ? value : `${value.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`;
}

function countBy_(items, property) {
  return items.reduce((counts, item) => {
    counts[item[property]] = (counts[item[property]] || 0) + 1;
    return counts;
  }, {});
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
