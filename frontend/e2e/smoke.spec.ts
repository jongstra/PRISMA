// Browser smoke tests: the built app opens in Chrome, its pages work together, and files load and save. They check that
// nothing is broken, not every detail (the unit tests in src/ do that). Run them with npm run test-e2e.
import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { parse, stringify } from 'yaml';

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

test('the DeTT&CT controls are two rows of four equally wide boxes, with Load at the top right', async ({ page }) => {
  await openApp(page);
  const boxes = page.locator('.dettect-controls > *');
  const labels = await boxes.evaluateAll((all) =>
    all.map((box) => box.querySelector('.control-label')?.firstChild?.textContent?.trim()),
  );
  expect(labels).toEqual([
    'Visibility %',
    'Min. total occurrence',
    'Platforms',
    'DeTT&CT file',
    'Techniques',
    'Groups',
    'Components',
    'Legend: visibility',
  ]);
  const widths = await boxes.evaluateAll((all) => all.map((box) => Math.round(box.getBoundingClientRect().width)));
  expect(new Set(widths).size).toBe(1);
});

test('the MaGMa heatmap controls are five equally wide boxes, with the legend named after its score', async ({
  page,
}) => {
  await openApp(page);
  await openPage(page, 'MaGMa');
  await openTab(page, 'Heatmap');
  const widths = await page
    .locator('.heatmap-controls > *')
    .evaluateAll((all) => all.map((box) => Math.round(box.getBoundingClientRect().width)));
  expect(widths).toHaveLength(5);
  expect(new Set(widths).size).toBe(1);
  // The legend is named after the score it colours by, without a % sign (the swatches are the percentages).
  await expect(page.locator('.legend-box .control-label span').first()).toHaveText('Legend: weight');
});

test('the heatmap switch "with use case" only shows the techniques with use cases, and fits in its box', async ({
  page,
}) => {
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/example.yaml`);
  await openTab(page, 'Heatmap');
  const techniques = page.locator('.heatmap-container button');
  const withUseCases = page.locator('.heatmap-container button.has-use-cases');
  const box = page.locator('.heatmap-controls > .control-box', { hasText: 'Techniques' });
  const toggle = box.locator('.use-case-switch');
  const height = async () => Math.round((await box.boundingBox())!.height);
  const heightBefore = await height();
  const all = await techniques.count();
  const covered = await withUseCases.count();
  expect(covered).toBeGreaterThan(0);
  expect(covered).toBeLessThan(all);

  // Off at the start; the label line reads 'Techniques with use case' in full, with the switch inside the box.
  await expect(box.getByRole('checkbox', { name: 'with use case' })).not.toBeChecked();
  const [toggleBox, boxBox] = [(await toggle.boundingBox())!, (await box.boundingBox())!];
  expect(toggleBox.x + toggleBox.width).toBeLessThanOrEqual(boxBox.x + boxBox.width);
  expect(await box.locator('.switch-text').evaluate((text) => text.scrollWidth <= text.clientWidth)).toBe(true);

  await toggle.click();
  await expect(techniques).toHaveCount(covered);
  await expect(page.locator('.heatmap-container button:not(.has-use-cases)')).toHaveCount(0);
  expect(await height()).toBe(heightBefore);
  await toggle.click();
  await expect(techniques).toHaveCount(all);

  // The labels, the text, the switches, the thinner search field and the clear icon of the panel share one middle, also
  // with a group selected.
  const groups = page.locator('.heatmap-controls .selection-container');
  await groups.locator('input.search-box').fill('APT41');
  await page.locator('.suggestion-item', { hasText: 'APT41' }).first().click();
  await expect(groups.locator('.clear-icon')).toBeVisible();
  const middles = await page.locator('.heatmap-controls').evaluate((panel) =>
    [
      ...panel.querySelectorAll(
        '.control-label > span:first-child, span.control-label, .switch-text, .switch, .toggle-switch, .search-box.compact, .clear-icon',
      ),
    ].map((element) => {
      const { top, height } = element.getBoundingClientRect();
      return top + height / 2;
    }),
  );
  expect(middles).toHaveLength(10); // five labels, the text, two switches, the search field and the clear icon
  expect(Math.max(...middles) - Math.min(...middles)).toBeLessThanOrEqual(0.5);
});

test('the groups box asks before clearing groups, and keeps its height while they are selected and cleared', async ({
  page,
}) => {
  await openApp(page);
  const box = page.locator('.selection-container').first();
  const field = box.locator('input.search-box');
  const height = async () => Math.round((await box.boundingBox())!.height);
  const before = await height();
  for (const group of ['APT28', 'APT29', 'FIN7', 'Lazarus Group', 'Wizard Spider']) {
    await field.fill(group);
    await page.locator('.suggestion-item', { hasText: group }).first().click();
  }
  expect(await height()).toBe(before);
  // Clearing five groups asks first.
  await page.locator('.clear-icon').first().click();
  await expect(page.locator('.swal2-title')).toHaveText('Clear all 5 groups?');
  // The height in every frame while the groups are cleared: no jump, also not for a moment.
  await box.evaluate((element) => {
    const heights: number[] = [];
    (window as unknown as { heights: number[] }).heights = heights;
    const start = performance.now();
    const sample = () => {
      heights.push(Math.round(element.getBoundingClientRect().height));
      if (performance.now() - start < 400) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByRole('button', { name: 'Yes, clear them' }).click();
  await page.waitForTimeout(500);
  await expect(box.locator('.buttons-wrapper button')).toHaveCount(0);
  const heights = await page.evaluate(() => (window as unknown as { heights: number[] }).heights);
  expect(Math.max(...heights)).toBe(before);
});

test('the Insights page shows its charts for the loaded DeTT&CT file', async ({ page }) => {
  await openApp(page);
  await page.locator('#fileInput').setInputFiles(`${EXAMPLES}/dettect/enterprise.yaml`);
  await expect(message(page, 'DeTT&CT file loaded:')).toBeVisible();

  await openPage(page, 'Insights');
  await expect(page.getByText('Visibility % per Tactic')).toBeVisible();
  await expect(page.getByText('Visibility % per Platform')).toBeVisible();
});

test('the MaGMa tabs are a menu bar like the ones above, with the content of every tab 5px below it', async ({
  page,
}) => {
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/example.yaml`);
  const bar = page.locator('.sheet-tabs');
  await expect(bar.locator('.tab-group .sheet-tab')).toHaveCount(6);
  const right = async (locator: Locator) => {
    const box = (await locator.boundingBox())!;
    return Math.round(box.x + box.width);
  };
  expect(await right(page.locator('.save-button'))).toBe(await right(page.locator('.navigation')));

  const firstBox: Record<string, string> = {
    L1: '.fixed-table th',
    L2: '.fixed-table th',
    L3: '.fixed-table th',
    Heatmap: '.heatmap-controls',
    Insights: '.magma-insights .chart-card',
    Summary: '.magma-summary .chart-card',
  };
  for (const [tab, selector] of Object.entries(firstBox)) {
    await openTab(page, tab);
    const barBox = (await bar.boundingBox())!;
    const contentTop = (await page.locator(selector).first().boundingBox())!.y;
    expect(Math.round(contentTop - (barBox.y + barBox.height)), tab).toBe(5);
  }
});

test('the Enterprise matrix fits a Full HD window without scrolling sideways or cutting a name, on both pages', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openApp(page);
  const widths = (selector: string) =>
    page.locator(selector).evaluate((matrix) => `${matrix.scrollWidth} of ${matrix.clientWidth}px`);
  const fits = (text: string) => Number(text.split(' ')[0]) <= Number(text.split(' ')[2]!.replace('px', ''));
  const dettect = await widths('.matrix-container');
  expect(fits(dettect), `DeTT&CT matrix: ${dettect}`).toBe(true);
  const cut = await page
    .locator('.buttontext')
    .evaluateAll((texts) =>
      texts.filter((text) => text.scrollHeight > text.clientHeight + 1).map((text) => text.textContent?.trim()),
    );
  expect(cut, 'names that need more than two lines').toEqual([]);
  await openPage(page, 'MaGMa');
  await openTab(page, 'Heatmap');
  const heatmap = await widths('.heatmap-container');
  expect(fits(heatmap), `heatmap: ${heatmap}`).toBe(true);
});

test('the matrix fills the window below the controls and scrolls itself, with the tactic names frozen at its top', async ({
  page,
}) => {
  await openApp(page); // 1400 × 900
  const matrix = page.locator('.matrix-container');
  const firstName = page.locator('.button-column-tactic-name').first();
  const bottom = async (area: Locator) => {
    const box = (await area.boundingBox())!;
    return Math.round(box.y + box.height);
  };
  // Above every column its name, then its number of techniques and its visibility in a chip on one line.
  await expect(page.locator('.column-header .visibility-chip')).toHaveCount(14);
  await expect(page.locator('.button-column-stats').first()).toHaveText(/^10 techniques\s*0%$/);
  // The page does not scroll: the matrix reaches to 8px above the bottom of the window.
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  expect(await bottom(matrix)).toBe(892);
  await expect(page.locator('.scroll-thumb.vertical')).toBeVisible();
  await expect(page.locator('.scroll-thumb.horizontal')).toBeVisible();

  // The wheel over the controls scrolls the matrix, not the page; the tactic names stay, with a line below them.
  const nameTop = (await firstName.boundingBox())!.y;
  await page.mouse.move(300, 150);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => matrix.evaluate((area) => area.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect((await firstName.boundingBox())!.y).toBe(nameTop);
  await expect(matrix).toHaveClass(/scrolled/);

  // The heatmap fills the window the same way, with the score of every tactic in a chip in its header.
  await openPage(page, 'MaGMa');
  await openTab(page, 'Heatmap');
  expect(await bottom(page.locator('.heatmap-container'))).toBe(892);
  await expect(page.locator('.column-header .score-chip')).toHaveCount(14);
  await expect(page.locator('.button-column-stats').first()).toHaveText(/^10 techniques\s*0%$/);

  // In a phone-sized window the page scrolls as before.
  await page.setViewportSize({ width: 375, height: 812 });
  await openPage(page, 'DeTT&CT');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
});

test('a sheet fills the window below the tabs and scrolls itself, with its column headers frozen at its top', async ({
  page,
}) => {
  await openApp(page); // 1400 × 900
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/heatmap-colours.yaml`);
  await openTab(page, 'L3');
  const sheet = page.locator('.sheet-scroll');
  const header = page.locator('table.fixed-table thead th').nth(1);
  const box = async (locator: Locator) => (await locator.boundingBox())!;
  // The page does not scroll: the sheet reaches to 8px above the bottom of the window.
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  const sheetBox = await box(sheet);
  expect(Math.round(sheetBox.y + sheetBox.height)).toBe(892);

  // The wheel over the tabs scrolls the sheet; the column headers stay, with a shadow below them.
  const headerTop = (await box(header)).y;
  await page.mouse.move(300, 120);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => sheet.evaluate((area) => area.scrollTop)).toBeGreaterThan(0);
  expect((await box(header)).y).toBe(headerTop);
  await expect(sheet).toHaveClass(/scrolled/);

  // Going down with the arrows keeps the cell with the cursor in view, below the frozen headers.
  await sheet.evaluate((area) => {
    area.scrollTop = 0;
  });
  await page.locator('table.fixed-table tbody textarea[data-field="name"]').first().click();
  for (let step = 0; step < 30; step += 1) {
    await page.keyboard.press('ArrowDown');
  }
  const cursor = await page.evaluate(() => {
    const cell = document.activeElement!.closest('td')!.getBoundingClientRect();
    return { top: cell.top, bottom: cell.bottom };
  });
  const headerBox = await box(header);
  expect(cursor.top).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
  expect(cursor.bottom).toBeLessThanOrEqual(892);
});

test('a sheet that scrolls sideways keeps its first columns at the left, and its rows level', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 }); // L3 is wider than this window
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/heatmap-colours.yaml`);
  await openTab(page, 'L3');
  const sheet = page.locator('.sheet-scroll');
  const firstId = page.locator('table.fixed-table tbody textarea[data-field="id"]').first();
  const idLeft = (await firstId.boundingBox())!.x;
  await sheet.evaluate((area) => {
    area.scrollLeft = area.scrollWidth;
  });
  expect(await sheet.evaluate((area) => area.scrollLeft)).toBeGreaterThan(100);
  await expect(sheet).toHaveClass(/scrolled-sideways/);
  expect((await firstId.boundingBox())!.x).toBe(idLeft); // the delete column, ID and name stay

  // The cursor in a frozen cell keeps the sheet's place; Tab to the description (under the frozen columns) brings it
  // into view beside them.
  const scrolledTo = await sheet.evaluate((area) => area.scrollLeft);
  await page.locator('table.fixed-table tbody textarea[data-field="name"]').first().click();
  expect(await sheet.evaluate((area) => area.scrollLeft)).toBe(scrolledTo);
  await page.keyboard.press('Tab');
  const frozenRight = await page.evaluate(
    () => document.querySelector('table.fixed-table tbody td.frozen-last')!.getBoundingClientRect().right,
  );
  const cursorLeft = await page.evaluate(() => document.activeElement!.closest('td')!.getBoundingClientRect().left);
  expect(cursorLeft).toBeGreaterThanOrEqual(frozenRight);

  // A selection dragged across the frozen columns, either way, opens up the columns hidden behind them once it is made:
  // its left side comes into view beside the frozen columns.
  const centre = async (row: number, field: string) => {
    const box = (await page
      .locator(`table.fixed-table tbody tr:nth-child(${row}) td[data-cell$=":${field}"]`)
      .boundingBox())!;
    return { x: box.x + Math.min(20, box.width / 2), y: box.y + box.height / 2 };
  };
  for (const [from, to] of [
    ['name', 'dataSource'],
    ['dataSource', 'name'],
  ] as const) {
    await page.keyboard.press('Escape');
    await sheet.evaluate((area) => {
      area.scrollLeft = area.scrollWidth;
    });
    const start = await centre(2, from);
    const end = await centre(3, to);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('td.cell-selected')).toHaveCount(8); // 2 rows from the name to the data source
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.querySelector('tbody tr:nth-child(2) td[data-cell$=":description"]')!.getBoundingClientRect().left,
        ),
      )
      .toBeGreaterThanOrEqual(frozenRight);
    // The label of the selection stays under its bottom left cell, the name, which moved along.
    const nameLeft = (await page
      .locator('table.fixed-table tbody tr:nth-child(3) td[data-cell$=":name"]')
      .boundingBox())!.x;
    await expect
      .poll(async () => Math.round((await page.locator('.selection-label').boundingBox())!.x))
      .toBe(Math.round(nameLeft));
  }

  // Every row is three lines high: a long picked parent or technique ends in an ellipsis instead of a fourth line.
  const heights = await page
    .locator('table.fixed-table tbody tr:has(td.remove-col)')
    .evaluateAll((rows) => rows.map((row) => Math.round(row.getBoundingClientRect().height)));
  expect(new Set(heights)).toEqual(new Set([heights[0]]));
});

test('the MaGMa page fits a phone: its tabs in two rows of three, and nothing sticks out of the window', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openApp(page);
  await openPage(page, 'MaGMa');
  for (const tab of ['L1', 'L2', 'L3', 'Heatmap', 'Insights', 'Summary']) {
    await openTab(page, tab); // a click, as a user does: it fails when a tab is squeezed out of sight
    await expect(page.locator('.sheet-tab.active')).toHaveText(tab);
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, `the page width on the ${tab} tab`).toBeLessThanOrEqual(375);
  }
  const tabTops = await page
    .locator('.sheet-tab')
    .evaluateAll((tabs) => tabs.map((tab) => Math.round(tab.getBoundingClientRect().top)));
  expect(new Set(tabTops).size).toBe(2);
  for (const button of ['.load-button', '.save-button']) {
    const box = (await page.locator(button).boundingBox())!;
    expect(box.x + box.width, button).toBeLessThanOrEqual(375);
  }
});

// Without a mouse: Tab reaches Load and Save, and Enter opens the file dialog, saves, sorts a sheet and deletes a sheet.
test('Load, Save and the sheet headers work with the keyboard', async ({ page }) => {
  await openApp(page);
  const chooseDettectFile = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Load DeTT&CT YAML' }).focus();
  await page.keyboard.press('Enter');
  await chooseDettectFile;

  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/example.yaml`);
  await openTab(page, 'L3');
  const reached = new Set<string>();
  for (let press = 0; press < 30 && !(reached.has('Load MaGMa YAML') && reached.has('Save MaGMa YAML')); press++) {
    await page.keyboard.press('Tab');
    reached.add(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''));
  }
  expect(reached).toContain('Load MaGMa YAML');
  expect(reached).toContain('Save MaGMa YAML');

  const chooseMagmaFile = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Load MaGMa YAML' }).focus();
  await page.keyboard.press('Enter');
  await chooseMagmaFile;
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save MaGMa YAML' }).focus();
  await page.keyboard.press('Enter');
  await download;

  const weight = page.locator('thead th', { hasText: 'Weight' });
  await weight.getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(weight).toHaveClass(/sorted/);
  await page.locator('thead th.frozen-start').getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(message(page, 'You are about to delete all L3 use cases')).toBeVisible();
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
  expect(await sheetIds(page)).toEqual(expect.arrayContaining(['DOS-1-A', 'FIN-1-A', 'THR-1-A']));

  await openTab(page, 'Heatmap');
  await expect(tacticColumns(page)).toHaveCount(14);
  await openTab(page, 'Insights');
  await expect(page.getByText('Use Cases per Layer')).toBeVisible();
  await openTab(page, 'Summary');
  await expect(page.locator('.magma-summary').getByText('FIN Financial Loss')).toBeVisible();
  await expect(page.locator('.magma-summary .averages')).toContainText('Implementation74.8%');
});

test('a change in a sheet can be undone and redone, with the keyboard and the buttons', async ({ page }) => {
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/example.yaml`);
  await openTab(page, 'L1');
  const name = page.locator('table.fixed-table tbody tr').nth(2).locator('textarea').nth(1);
  const before = await name.inputValue();
  await name.fill('Changed name');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(name).toHaveValue(before);
  await page.locator('.redo-button').click();
  await expect(name).toHaveValue('Changed name');
  await page.locator('.undo-button').click();
  await expect(name).toHaveValue(before);
});

// A MaGMa file with 20 L1 and 40 L2 use cases and this many L3 rules under them, each at 50% visibility,
// implementation and effectiveness (a weight of 12.50).
function bigMagmaFile(rules: number) {
  const domain = 'enterprise-attack';
  const useCases: object[] = [];
  for (let i = 0; i < 20; i++) {
    useCases.push({ domain, level: 1, id: `B${i}`, name: `Risk ${i}`, inImpact: 20, thrImpact: 30, outImpact: 50 });
  }
  for (let j = 0; j < 40; j++) {
    useCases.push({ domain, level: 2, id: `B${j % 20}-${j}`, name: `Use case ${j}`, parentIds: [`B${j % 20}`] });
  }
  for (let k = 0; k < rules; k++) {
    useCases.push({
      domain,
      level: 3,
      id: `R-${k}`,
      name: `Rule ${k}`,
      parentIds: [`B${k % 20}-${k % 40}`],
      attackTechniqueId: 'T1059',
      visibility: 50,
      visibilityFromAttackTechniqueOverride: true,
      implementation: 50,
      effectiveness: 50,
    });
  }
  return { name: 'big.yaml', mimeType: 'application/yaml', buffer: Buffer.from(stringify(useCases)) };
}

// The sheets are tested with 1,000 rules: typing stays immediate. (Each ID and parent cell used to count all IDs on
// every redraw, about 1.3 seconds per keystroke at this size.)
test('a sheet with 1,000 rules shows a typed value and its weight straight away', async ({ page }) => {
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, bigMagmaFile(1000));
  await openTab(page, 'L3');
  await expect(page.locator('tbody [data-cell$=":implementation"]')).toHaveCount(1000);
  // From the typed value to the next frame, with the new weight in the row.
  const typed = await page.evaluate(async () => {
    const field = document.querySelector<HTMLInputElement>('tbody [data-cell$=":implementation"] > input')!;
    const weight = field.closest('tr')!.querySelector('[data-cell$=":weight"]')!;
    field.focus();
    const start = performance.now();
    field.value = '70';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
    return { milliseconds: performance.now() - start, weight: weight.textContent!.trim() };
  });
  expect(typed.weight).toBe('17.50');
  expect(typed.milliseconds).toBeLessThan(400);
});

test('a change in cells selected by dragging goes to all of the same kind, and can be undone', async ({ page }) => {
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/example.yaml`);
  await openTab(page, 'L3');
  const columnIndex = (title: string) =>
    page
      .locator('table.fixed-table thead th')
      .evaluateAll((headers, title) => headers.findIndex((th) => th.textContent!.trim().startsWith(title)), title);
  const cell = async (row: number, title: string) =>
    page
      .locator('table.fixed-table tbody tr')
      .nth(row)
      .locator('td')
      .nth(await columnIndex(title));
  const values = (title: string) =>
    Promise.all([0, 1, 2].map(async (row) => (await cell(row, title)).locator('input, textarea').inputValue()));
  const drag = async (from: { x: number; y: number }, to: Locator) => {
    const end = (await to.boundingBox())!;
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 10 });
    await page.mouse.up();
  };

  // Percentages: typing goes to both percentage columns of the block.
  const before = [await values('Implementation'), await values('Effectiveness')];
  const start = (await (await cell(0, 'Implementation')).boundingBox())!;
  await drag({ x: start.x + start.width / 2, y: start.y + start.height / 2 }, await cell(2, 'Effectiveness'));
  await page.keyboard.type('90');
  expect([await values('Implementation'), await values('Effectiveness')]).toEqual([
    ['90', '90', '90'],
    ['90', '90', '90'],
  ]);
  await page.keyboard.press('ControlOrMeta+z');
  expect([await values('Implementation'), await values('Effectiveness')]).toEqual(before);

  // Texts: a drag that starts beside the text still gives that cell the cursor, so typing goes to all selected texts.
  const name = (await (await cell(0, 'Use Case Name')).boundingBox())!;
  await drag({ x: name.x + 8, y: name.y + 6 }, await cell(2, 'Description'));
  await expect((await cell(0, 'Use Case Name')).locator('textarea')).toBeFocused();
  await page.keyboard.type('Checked');
  expect([await values('Use Case Name'), await values('Description')]).toEqual([
    ['Checked', 'Checked', 'Checked'],
    ['Checked', 'Checked', 'Checked'],
  ]);
});

test('IDs selected in the ID column get the typed base with letters after the ones in use', async ({ page }) => {
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/example.yaml`);
  await openTab(page, 'L3');
  await page.getByRole('button', { name: 'Add 5 empty use cases' }).click();
  const ids = () =>
    page
      .locator('table.fixed-table tbody textarea[data-field="id"]')
      .evaluateAll((fields) => fields.map((field) => (field as HTMLTextAreaElement).value));
  const before = await ids();
  const id = (index: number) => page.locator('table.fixed-table tbody textarea[data-field="id"]').nth(index);
  const from = (await id(before.length - 5).boundingBox())!;
  const to = (await id(before.length - 1).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.type('THR-1'); // THR-1-A to D exist
  await page.keyboard.press('Enter');
  expect((await ids()).slice(-5)).toEqual(['THR-1-E', 'THR-1-F', 'THR-1-G', 'THR-1-H', 'THR-1-I']);
  await page.keyboard.press('ControlOrMeta+z');
  expect(await ids()).toEqual(before);
});

test('cells copied from a spreadsheet are pasted from the cell with the cursor, adding rows as needed', async ({
  page,
}) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/example.yaml`);
  await openTab(page, 'L3');
  const names = () =>
    page
      .locator('table.fixed-table tbody textarea[data-field="name"]')
      .evaluateAll((fields) => fields.map((field) => (field as HTMLTextAreaElement).value));
  const before = await names();
  await page.getByRole('button', { name: '+ Add use case' }).click();
  // As Excel copies two rows of name, description and parent; the second row goes into a new use case.
  await page.evaluate(() =>
    navigator.clipboard.writeText('Beaconing\tTo rare domains\tTHR-1\r\nUploads\t"Over\n1 GB"\tTHR-1\r\n'),
  );
  await page.locator('table.fixed-table tbody textarea[data-field="name"]').last().click();
  await page.keyboard.press('ControlOrMeta+v');
  expect((await names()).slice(-2)).toEqual(['Beaconing', 'Uploads']);
  await expect(page.locator('.swal2-toast')).toContainText('Pasted 2 rows into L3, 1 of them new.');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.swal2-toast')).toBeHidden({ timeout: 1500 }); // the message goes with the change
  expect(await names()).toEqual([...before, '']);
});

test('the arrows, Enter and Tab move between the cells, as in a spreadsheet', async ({ page }) => {
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/example.yaml`);
  await openTab(page, 'L3');
  const names = page.locator('table.fixed-table tbody textarea[data-field="name"]');
  const focused = () =>
    page.evaluate(() => {
      const cell = document.activeElement?.closest('td')?.dataset.cell;
      return `${document.activeElement?.closest('tr')?.rowIndex}:${cell?.split(':')[1]}`;
    });
  await names.first().click();
  await page.keyboard.press('ArrowDown');
  expect(await focused()).toBe('2:name');
  await page.keyboard.type('Renamed'); // the text was selected on arrival: typing replaces it
  await page.keyboard.press('Enter');
  expect(await names.nth(1).inputValue()).toBe('Renamed');
  expect(await focused()).toBe('3:name');
  await page.keyboard.press('Tab');
  expect(await focused()).toBe('3:description');
  await page.keyboard.press('Tab');
  expect(await focused()).toBe('3:parentIds');

  // Shift+arrows select cells, as dragging does: typing goes to all of them; a plain arrow ends the selection.
  await names.first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(page.locator('td.cell-selected')).toHaveCount(3);
  await page.keyboard.type('Same');
  expect([await names.nth(0).inputValue(), await names.nth(1).inputValue(), await names.nth(2).inputValue()]).toEqual([
    'Same',
    'Same',
    'Same',
  ]);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('td.cell-selected')).toHaveCount(0);
});

test('a selection copied with Ctrl+C pastes back into new rows, and Ctrl+X cuts all of it', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await openApp(page);
  await openPage(page, 'MaGMa');
  await loadMagmaFile(page, `${EXAMPLES}/magma/example.yaml`);
  await openTab(page, 'L3');
  const names = page.locator('table.fixed-table tbody textarea[data-field="name"]');
  const descriptions = page.locator('table.fixed-table tbody textarea[data-field="description"]');
  const from = (await names.nth(0).boundingBox())!;
  const to = (await descriptions.nth(1).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.press('ControlOrMeta+c');
  await expect(page.locator('.selection-label')).toContainText('4 cells copied');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const [first, second] = [await names.nth(0).inputValue(), await names.nth(1).inputValue()];
  expect(copied.split(/\r?\n/)[0]!.split('\t')[0]).toBe(first);
  // Back into PRISMA: two new rows with the same names and descriptions.
  await page.getByRole('button', { name: '+ Add use case' }).click();
  await names.last().click();
  await page.keyboard.press('ControlOrMeta+v');
  expect([await names.nth(-2).inputValue(), await names.nth(-1).inputValue()]).toEqual([first, second]);

  // Cutting the pasted block (it is selected after the paste) empties all of it, and puts all of it on the clipboard.
  await page.keyboard.press('ControlOrMeta+x');
  await expect(page.locator('.selection-label')).toContainText('4 cells cut');
  expect([await names.nth(-2).inputValue(), await names.nth(-1).inputValue()]).toEqual(['', '']);
  expect((await page.evaluate(() => navigator.clipboard.readText())).split(/\r?\n/)[1]!.split('\t')[0]).toBe(second);
  await page.keyboard.press('ControlOrMeta+z');
  expect([await names.nth(-2).inputValue(), await names.nth(-1).inputValue()]).toEqual([first, second]);
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
