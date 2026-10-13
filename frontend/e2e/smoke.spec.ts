// Browser smoke tests: the built app opens in Chrome, its pages work together, and files load and save. They check that
// nothing is broken, not every detail (the unit tests in src/ do that). Run them with npm run test-e2e.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { parse } from 'yaml';

const EXAMPLES = '../examples';

// Every test fails on an error in the browser console. Warnings are shown, but do not fail the test.
let consoleErrors: string[];
test.beforeEach(({ page }) => {
  consoleErrors = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    } else if (message.type() === 'warning') {
      console.log(`Console warning: ${message.text()}`);
    }
  });
});
test.afterEach(() => {
  expect(consoleErrors, 'errors in the browser console').toEqual([]);
});

// Opens the app and waits until the ATT&CK data is loaded (the matrix shows), as a user would before loading a file.
async function openApp(page: Page) {
  await page.goto('/');
  await expect(page.locator('.button-column-tactic-name').first()).toBeVisible();
}

// The pages are opened with the navigation buttons, as a user does: going to a URL would reload the app and forget
// the loaded files.
const openPage = (page: Page, name: 'DeTT&CT' | 'Insights' | 'MaGMa') =>
  page.locator('.navigation').getByRole('link', { name, exact: true }).click();
const openTab = (page: Page, name: string) => page.locator('.sheet-tabs').getByRole('button', { name }).click();
const tacticColumns = (page: Page) => page.locator('.button-column-tactic-name');
const message = (page: Page, text: string) => page.locator('.swal2-container').getByText(text);

// The texts in the sheet that is open on the MaGMa page: IDs, names, descriptions and data sources.
const sheetIds = (page: Page) =>
  page
    .locator('table.fixed-table tbody textarea')
    .evaluateAll((fields) => fields.map((field) => (field as HTMLTextAreaElement).value));

async function loadMagmaFile(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.locator('#importYamlFile').setInputFiles(file);
  await expect(message(page, 'MaGMa file loaded:')).toBeVisible();
}

async function saveMagmaFile(page: Page): Promise<string> {
  const download = page.waitForEvent('download');
  await page.getByText('Save MaGMa YAML').click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

test('the DeTT&CT page shows the matrix and colours it after loading a DeTT&CT file', async ({ page }) => {
  await openApp(page);
  await expect(tacticColumns(page)).toHaveCount(14);
  await expect(tacticColumns(page).first()).toHaveText('Reconnaissance');

  await page.locator('#fileInput').setInputFiles(`${EXAMPLES}/dettect/enterprise.yaml`);
  await expect(message(page, 'DeTT&CT file loaded: 2 data sources for Enterprise')).toBeVisible();
  const coloured = page.locator('.button-column button[style*="background-color"]');
  await expect(coloured.first()).toBeVisible();
});

for (const { domain, name, file, tactics } of [
  { domain: 'Mobile', name: 'Mobile', file: 'mobile.yaml', tactics: 12 },
  { domain: 'ICS', name: 'ICS', file: 'ics.yaml', tactics: 12 },
]) {
  test(`the ${domain} domain shows its matrix and loads its DeTT&CT file`, async ({ page }) => {
    await openApp(page);
    await page.locator('.domain-switcher').getByRole('button', { name: domain, exact: true }).click();
    await expect(tacticColumns(page)).toHaveCount(tactics);
    await expect(tacticColumns(page).first()).toHaveText('Initial Access');

    await page.locator('#fileInput').setInputFiles(`${EXAMPLES}/dettect/${file}`);
    await expect(message(page, `for ${name}`)).toBeVisible();
  });
}

test('the Insights page shows its charts for the loaded DeTT&CT file', async ({ page }) => {
  await openApp(page);
  await page.locator('#fileInput').setInputFiles(`${EXAMPLES}/dettect/enterprise.yaml`);
  await expect(message(page, 'DeTT&CT file loaded:')).toBeVisible();

  await openPage(page, 'Insights');
  await expect(page.getByText('Tactics - Visibility Percentage')).toBeVisible();
  await expect(page.getByText('Platforms - Visibility Percentage')).toBeVisible();
});

test('the MaGMa page loads the example file and shows it on every tab', async ({ page }) => {
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/example.yaml`);
  await expect(message(page, 'MaGMa file loaded: 14 use cases for Enterprise')).toBeVisible();

  await openTab(page, 'L1');
  expect(await sheetIds(page)).toEqual(expect.arrayContaining(['IN', 'THR', 'DOS', 'FIN']));
  await openTab(page, 'L2');
  expect(await sheetIds(page)).toEqual(expect.arrayContaining(['DOS-1', 'FIN-1', 'IN-1', 'THR-1']));
  await openTab(page, 'L3');
  expect(await sheetIds(page)).toEqual(expect.arrayContaining(['DOS-1-1', 'FIN-1-1', 'THR-1-1']));

  await openTab(page, 'Heatmap');
  await expect(tacticColumns(page)).toHaveCount(14);
  await openTab(page, 'Insights');
  await expect(page.getByText('Number of Use Cases per Layer')).toBeVisible();
  await openTab(page, 'Summary');
  await expect(page.locator('.magma-summary').getByText('FIN Financial Loss')).toBeVisible();
  await expect(page.locator('.magma-summary .averages')).toContainText('Implementation74.8%');
});

// The fields of a use case that a user enters (the other fields are calculated). The visibility of an L3 rule is entered
// only when Override is on; otherwise it comes from DeTT&CT.
const ENTERED = ['name', 'description', 'parentIds', 'attackTechniqueId', 'visibilityFromAttackTechniqueOverride'];
const ENTERED_L1 = ['inImpact', 'thrImpact', 'outImpact'];
const ENTERED_L3 = ['implementation', 'effectiveness'];
type FileUseCase = Record<string, unknown> & { domain: string; level: number; id: string };

test('a saved MaGMa file keeps what was entered, loads again and saves to the same file', async ({ page, context }) => {
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/example.yaml`);
  const saved = await saveMagmaFile(page);

  const original: FileUseCase[] = parse(readFileSync(`${EXAMPLES}/magma/example.yaml`, 'utf8'));
  const savedUseCases: FileUseCase[] = parse(saved);
  for (const useCase of original.filter((useCase) => !useCase.permanent)) {
    const savedUseCase = savedUseCases.find((other) => other.domain === useCase.domain && other.id === useCase.id);
    const fields = [
      ...ENTERED,
      ...(useCase.level === 1 ? ENTERED_L1 : []),
      ...(useCase.level === 3 ? ENTERED_L3 : []),
      ...(useCase.visibilityFromAttackTechniqueOverride ? ['visibility'] : []),
    ].filter((field) => field in useCase);
    for (const field of fields) {
      expect(savedUseCase?.[field], `${field} of ${useCase.id}`).toEqual(useCase[field]);
    }
  }

  const freshPage = await context.newPage();
  await openApp(freshPage);
  await openPage(freshPage, 'MaGMa');
  await loadMagmaFile(freshPage, { name: 'magma_data.yaml', mimeType: 'text/yaml', buffer: Buffer.from(saved) });
  expect(await saveMagmaFile(freshPage)).toBe(saved);
});
