import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import fs from 'node:fs';
import { parse } from 'yaml';
import { tacticsStore } from '../tactics';
import { magmaStore, type ImportResult, type UseCase } from '../magma';
import { importSummary, magmaFileDomains, readMagmaFile, writeMagmaFile } from '@/io/magmaFile';

const catalog = JSON.parse(fs.readFileSync('public/tactics_and_techniques_by_domain.json', 'utf8'));
const readExample = (name: string) => fs.readFileSync(`../examples/${name}`, 'utf8');

// A MaGMa file read as the app reads it, and the use cases in a store written as a MaGMa file (see io/magmaFile.ts).
type MagmaStore = ReturnType<typeof magmaStore>;
const readFile = (text: string) => readMagmaFile(parse(text));
// The whole import summary as one text: the counts, the use cases that failed and the warnings.
const summaryText = (result: ImportResult) => {
  const summary = importSummary(result);
  return [summary.text, ...summary.failed, ...summary.warnings].join('\n');
};
const saveFile = (magma: MagmaStore) => writeMagmaFile(magma.domainSortedUseCases);

// Fresh stores, with the ATT&CK catalog and the permanent IN and THR use cases.
async function setUpStores() {
  setActivePinia(createPinia());
  const tactics = tacticsStore();
  const copy = structuredClone(catalog);
  tactics.enterprise = copy.enterprise;
  tactics.mobile = copy.mobile;
  tactics.ics = copy.ics;
  const magma = magmaStore();
  magma.initializeDefaultUseCases();
  return { tactics, magma };
}

describe('magma store with the example files', () => {
  let magma: MagmaStore;

  beforeEach(async () => {
    const stores = await setUpStores();
    stores.tactics.processDettectYaml(parse(readExample('dettect/enterprise_large.yaml')));
    magma = stores.magma;
    magma.importUseCases(readFile(readExample('magma/example.yaml')));
    magma.updateAllL3UseCasesBasedOnDettectVisibility();
  });

  const value = (id: string, field: keyof UseCase) =>
    Number(magma.getUseCaseById(id, 'enterprise-attack')![field]).toFixed(2);

  it('gives the known values for the example (same as before the recalculation rework)', () => {
    expect([value('IN', 'weight'), value('THR', 'weight')]).toEqual(['12.17', '0.00']);
    expect([value('DOS', 'visibility'), value('DOS', 'weight'), value('DOS', 'risk')]).toEqual([
      '0.00',
      '0.00',
      '95.98',
    ]);
    expect([value('FIN', 'visibility'), value('FIN', 'weight'), value('FIN', 'risk')]).toEqual([
      '16.67',
      '11.30',
      '92.14',
    ]);
  });

  it('updates the business risks when an L3 use case under cumulative IN changes', () => {
    magma.updateUseCase(
      magma.getUseCaseById('IN-1-A', 'enterprise-attack')!.uid,
      { effectiveness: 100 },
      'enterprise-attack',
    );
    expect(value('IN', 'weight')).toBe('15.60');
    expect(value('DOS', 'risk')).toBe('94.85');
    expect(value('FIN', 'risk')).toBe('91.01');
  });

  it('updates parents and risks when an L3 use case is removed', () => {
    magma.removeUseCaseByUid(magma.getUseCaseById('IN-1-A', 'enterprise-attack')!.uid);
    expect(value('IN', 'weight')).toBe('0.00');
    expect(value('DOS', 'risk')).toBe('100.00');
  });

  it('gives a new L1 use case a risk straight away', () => {
    magma.addNewUseCase(1, 'enterprise-attack');
    const created = magma.L1UseCases('enterprise-attack').at(-1);
    expect(Number(created!.risk).toFixed(2)).toBe('87.83'); // IN impact 100% × cumulative IN 12.17%.
  });
});

describe('magma store with the same IDs in two domains', () => {
  it('gives every use case its own internal ID, also IN and THR in each domain', async () => {
    const { magma } = await setUpStores();
    expect(magma.useCases.length).toBe(6);
    expect(new Set(magma.useCases.map((useCase) => useCase.uid)).size).toBe(6);
  });

  it('calculates each domain separately', async () => {
    const { magma } = await setUpStores();
    const useCases = (domain: string, implementation: number) => [
      { domain, level: 1, id: 'D', name: 'd', inImpact: 0, thrImpact: 0, outImpact: 100 },
      { domain, level: 2, id: 'D-1', name: 'd1', parentIds: ['D'] },
      {
        domain,
        level: 3,
        id: 'D-1-1',
        name: 'd11',
        parentIds: ['D-1'],
        visibility: 50,
        implementation,
        effectiveness: 50,
        visibilityFromAttackTechniqueOverride: true,
      },
    ];
    magma.importUseCases([...useCases('enterprise-attack', 100), ...useCases('mobile-attack', 50)]);
    expect(magma.getUseCaseById('D-1', 'enterprise-attack')?.weight).toBeCloseTo(25);
    expect(magma.getUseCaseById('D-1', 'mobile-attack')?.weight).toBeCloseTo(12.5);
    expect(magma.getUseCaseById('D', 'mobile-attack')?.risk).toBeCloseTo(87.5);
  });
});

describe('magma store performance', () => {
  it('imports 20 L1, 100 L2 and 1,000 L3 use cases quickly', async () => {
    const { magma } = await setUpStores();
    const useCases: object[] = [];
    for (let i = 0; i < 20; i++)
      useCases.push({
        domain: 'enterprise-attack',
        level: 1,
        id: `B${i}`,
        name: 'b',
        inImpact: 34,
        thrImpact: 33,
        outImpact: 33,
      });
    for (let j = 0; j < 100; j++)
      useCases.push({
        domain: 'enterprise-attack',
        level: 2,
        id: `B${j % 20}-${j}`,
        name: 'l2',
        parentIds: [`B${j % 20}`],
      });
    for (let k = 0; k < 1000; k++)
      useCases.push({
        domain: 'enterprise-attack',
        level: 3,
        id: `L3-${k}`,
        name: 'l3',
        parentIds: [`B${k % 20}-${k % 100}`],
        implementation: 50,
        effectiveness: 50,
        visibility: 50,
        visibilityFromAttackTechniqueOverride: true,
      });
    const start = performance.now();
    magma.importUseCases(useCases);
    magma.updateAllL3UseCasesBasedOnDettectVisibility();
    expect(magma.useCases.length).toBe(1126);
    expect(performance.now() - start).toBeLessThan(2000); // Was about 3.7 seconds; now about 0.13, with room for GitHub's slower computers.
  });
});

describe('magma store: invalid data is rejected on import, with the reason', () => {
  it('rejects use cases that are their own (indirect) parent, and non-numeric or out-of-range percentages', async () => {
    const { magma } = await setUpStores();
    const domain = 'enterprise-attack';
    const message = summaryText(
      magma.importUseCases([
        { domain, level: 1, id: 'BIZ', name: 'b', inImpact: 0, thrImpact: 0, outImpact: 100 },
        { domain, level: 2, id: 'BIZ-1', name: 'ok', parentIds: ['BIZ'] },
        { domain, level: 2, id: 'SELF', name: 'self', parentIds: ['SELF'] },
        { domain, level: 2, id: 'A', name: 'a', parentIds: ['B'] },
        { domain, level: 2, id: 'B', name: 'b', parentIds: ['A'] },
        { domain, level: 3, id: 'TEXT', name: 't', parentIds: ['BIZ-1'], implementation: 'abc' },
        { domain, level: 3, id: 'NEGATIVE', name: 'n', parentIds: ['BIZ-1'], effectiveness: -5 },
        { domain, level: 3, id: 'TOO-HIGH', name: 'h', parentIds: ['BIZ-1'], visibility: 150 },
        {
          domain,
          level: 3,
          id: 'AS-TEXT',
          name: 'ok',
          parentIds: ['BIZ-1'],
          visibility: '50',
          implementation: 100,
          effectiveness: 100,
          visibilityFromAttackTechniqueOverride: true,
        },
      ]),
    );
    const imported = magma.useCases
      .filter((u) => !u.permanent)
      .map((u) => u.id)
      .sort();
    expect(imported).toEqual(['AS-TEXT', 'BIZ', 'BIZ-1']);
    expect(message).toContain('Successful imports: 3. Failed imports: 6.');
    expect(message).toContain('"SELF" in domain "enterprise-attack" is its own (indirect) parent: SELF → SELF');
    expect(message).toContain('A → B → A');
    expect(message).toContain('implementation "abc" is not valid');
    expect(message).toContain('effectiveness "-5" is not valid');
    expect(magma.getUseCaseById('BIZ', domain)?.risk).toBeCloseTo(50); // Only AS-TEXT counts: 50% × 100% × 100%.
  });

  it('warns about use cases with more than one parent', async () => {
    const { magma } = await setUpStores();
    const message = summaryText(
      magma.importUseCases([
        { domain: 'enterprise-attack', level: 2, id: 'DOS-1', name: 'd' },
        { domain: 'enterprise-attack', level: 2, id: 'FIN-1', name: 'f' },
        { domain: 'enterprise-attack', level: 3, id: 'DOS-1-1', name: 'comma typo', parentIds: ['DOS-1', 'FIN-1'] },
        { domain: 'enterprise-attack', level: 3, id: 'DOS-1-2', name: 'fine', parentIds: ['DOS-1'] },
      ]),
    );
    expect(message).toContain('Successful imports: 4. Failed imports: 0.');
    expect(message).toContain('"DOS-1-1" in domain "enterprise-attack" has 2 parents (DOS-1, FIN-1)');
    expect(message).not.toContain('"DOS-1-2"');
  });

  it('keeps use cases with an unknown parent ID, and warns about them', async () => {
    const { magma } = await setUpStores();
    const message = summaryText(
      magma.importUseCases([
        { domain: 'enterprise-attack', level: 2, id: 'DOS-1', name: 'd', parentIds: ['DOS'] },
        { domain: 'enterprise-attack', level: 3, id: 'DOS-1-1', name: 'typo', parentIds: ['DOS-l'] },
      ]),
    );
    expect(magma.getUseCaseById('DOS-1-1', 'enterprise-attack')).toBeDefined();
    expect(message).toContain('Successful imports: 2. Failed imports: 0.');
    expect(message).toContain('"DOS-1-1" in domain "enterprise-attack" has parent "DOS-l", which does not exist');
    expect(message).toContain('"DOS-1" in domain "enterprise-attack" has parent "DOS", which does not exist');
  });
});

// Files written by hand or by other scripts: what is clearly meant is read that way, the rest is refused with a reason.
describe('magma store: loading files written by hand', () => {
  const domain = 'enterprise-attack';

  it('reads an ID written as a number as text, so the file loads and saves', async () => {
    const { magma } = await setUpStores();
    const message = summaryText(
      magma.loadUseCases(readFile(`- {domain: ${domain}, level: 1, id: 123, name: b, inImpact: 100}`)),
    );
    expect(message).toContain('Successful imports: 1. Failed imports: 0.');
    expect(magma.getUseCaseById('123', domain)).toBeDefined();
    expect(parse(saveFile(magma)).find((useCase: UseCase) => useCase.name === 'b').id).toBe('123');
  });

  it('refuses an ID that is not text or a number, with the reason', async () => {
    const { magma } = await setUpStores();
    const message = summaryText(
      magma.loadUseCases(readFile(`- {domain: ${domain}, level: 1, id: [A, B], name: b, inImpact: 100}`)),
    );
    expect(message).toContain('Successful imports: 0. Failed imports: 1.');
    expect(message).toContain('The ID ["A","B"] is not valid: an ID is text, such as DOS-1.');
  });

  it('reads a parent written as text or a number as a list of one, and an empty one as no parent', async () => {
    const { magma } = await setUpStores();
    const message = summaryText(
      magma.loadUseCases(
        readFile(
          [
            `- {domain: ${domain}, level: 1, id: A, name: a, outImpact: 100}`,
            `- {domain: ${domain}, level: 1, id: 7, name: b, outImpact: 100}`,
            `- {domain: ${domain}, level: 2, id: A-1, name: a1, parentIds: A}`,
            `- {domain: ${domain}, level: 2, id: B-1, name: b1, parentIds: [7]}`,
            `- {domain: ${domain}, level: 3, id: R-1, name: r1, parentIds: A-1, visibility: 50, implementation: 100, effectiveness: 100}`,
            `- {domain: ${domain}, level: 3, id: R-2, name: r2, parentIds: ''}`,
          ].join('\n'),
        ),
      ),
    );
    expect(message).toContain('Successful imports: 6. Failed imports: 0.');
    expect(['A-1', 'B-1', 'R-1', 'R-2'].map((id) => magma.getUseCaseById(id, domain)!.parentIds)).toEqual([
      ['A'],
      ['7'],
      ['A-1'],
      undefined,
    ]);
    expect(magma.getUseCaseById('A', domain)!.weight).toBeCloseTo(50);
  });

  it('refuses a parent that is not an ID or a list of IDs, with the reason', async () => {
    const { magma } = await setUpStores();
    const message = summaryText(
      magma.loadUseCases(readFile(`- {domain: ${domain}, level: 2, id: A-1, name: a1, parentIds: {id: A}}`)),
    );
    expect(message).toContain('Successful imports: 0. Failed imports: 1.');
    expect(message).toContain(
      'The parent {"id":"A"} of use case "A-1" is not valid: a parent is an ID, such as DOS-1.',
    );
  });

  it('warns about a parent on the wrong level, and leaves it out of the scores of that parent', async () => {
    const { magma } = await setUpStores();
    const message = summaryText(
      magma.loadUseCases(
        readFile(
          [
            `- {domain: ${domain}, level: 1, id: A, name: a, outImpact: 100}`,
            `- {domain: ${domain}, level: 1, id: B, name: b, outImpact: 100, parentIds: [A]}`,
            `- {domain: ${domain}, level: 2, id: A-1, name: a1, parentIds: [A]}`,
            `- {domain: ${domain}, level: 3, id: R-1, name: r1, parentIds: [A-1], visibility: 100, implementation: 100, effectiveness: 100}`,
            `- {domain: ${domain}, level: 3, id: R-2, name: r2, parentIds: [A], visibility: 0}`,
          ].join('\n'),
        ),
      ),
    );
    expect(message).toContain('Successful imports: 5. Failed imports: 0.');
    expect(message).toContain(
      '"R-2" in domain "enterprise-attack" has parent "A" on level 1, while its parent should be on level 2; it does not count for "A".',
    );
    expect(message).toContain(
      '"B" in domain "enterprise-attack" has parent "A", while a level 1 use case has no parent; it does not count for "A".',
    );
    expect(magma.getUseCaseById('A', domain)!.weight).toBeCloseTo(100); // only A-1 counts, not R-2 or B
    expect(magma.getChildUseCases(magma.getUseCaseById('A', domain)!).map((useCase) => useCase.id)).toEqual(['A-1']);
  });

  it('trims spaces around an ID, and refuses none and IDs with a space or comma inside, as the sheets do', async () => {
    const { magma } = await setUpStores();
    const message = summaryText(
      magma.loadUseCases(
        readFile(
          ["' X '", 'none', "'A B'", "'A,B'"]
            .map((id) => `- {domain: ${domain}, level: 1, id: ${id}, name: n, outImpact: 100}`)
            .join('\n'),
        ),
      ),
    );
    expect(message).toContain('Successful imports: 1. Failed imports: 3.');
    expect(magma.getUseCaseById('X', domain)).toBeDefined();
    expect(message).toContain('The ID "none" is not valid: none means no parent.');
    expect(message).toContain('The ID "A B" is not valid: an ID cannot contain spaces or commas.');
    expect(message).toContain('The ID "A,B" is not valid: an ID cannot contain spaces or commas.');
  });

  it('reads a parent of only spaces as no parent', async () => {
    const { magma } = await setUpStores();
    magma.loadUseCases(readFile(`- {domain: ${domain}, level: 2, id: A-1, name: a1, parentIds: '  '}`));
    expect(magma.getUseCaseById('A-1', domain)!.parentIds).toBeUndefined();
  });

  it('warns about impacts that are filled in but do not add up to 100', async () => {
    const { magma } = await setUpStores();
    const message = summaryText(
      magma.loadUseCases(
        readFile(
          [
            `- {domain: ${domain}, level: 1, id: A, name: a, inImpact: 80, thrImpact: 80, outImpact: 80}`,
            `- {domain: ${domain}, level: 1, id: B, name: b, inImpact: 33.3, thrImpact: 33.3, outImpact: 33.4}`,
            `- {domain: ${domain}, level: 1, id: C, name: c}`, // not filled in yet, as in the Excel template
          ].join('\n'),
        ),
      ),
    );
    expect(message).toContain('Successful imports: 3. Failed imports: 0.');
    expect(message).toContain(
      'Use case "A" in domain "enterprise-attack" has IN, THROUGH and OUT impacts that add up to 240%, not 100%.',
    );
    expect(message).not.toContain('"B"');
    expect(message).not.toContain('"C"');
  });

  it('refuses a use case of its own marked permanent: only IN and THR are', async () => {
    const { magma } = await setUpStores();
    const message = summaryText(
      magma.loadUseCases(
        readFile(
          [
            `- {domain: ${domain}, level: 1, id: IN, name: in, permanent: true}`,
            `- {domain: ${domain}, level: 3, id: P-1, name: p, permanent: true}`,
            `- {domain: ${domain}, level: 3, id: R-1, name: r}`,
          ].join('\n'),
        ),
      ),
    );
    expect(message).toContain('Successful imports: 1. Failed imports: 1.');
    expect(message).toContain(
      'Use case "P-1" in domain "enterprise-attack" is marked permanent, which only IN and THR are.',
    );
  });

  it('leaves the use cases and their history as they were when loading fails unexpectedly', async () => {
    const { magma } = await setUpStores();
    magma.loadUseCases(readFile(readExample('magma/example.yaml')));
    magma.recordStep('Add a use case to L1');
    magma.addNewUseCase(1, domain);
    const before = JSON.stringify(magma.useCases);
    vi.spyOn(magma, 'importUseCases').mockImplementation(() => {
      throw new Error('Something unexpected');
    });
    expect(() => magma.loadUseCases(readFile(readExample('magma/template.yaml')))).toThrow('Something unexpected');
    expect(JSON.stringify(magma.useCases)).toBe(before);
    expect(magma.history.undo.length).toBe(1);
  });
});

describe('magma store: saving and loading', () => {
  it('saves a new L1 use case without NaN values, and loads it back with the same risk', async () => {
    const first = await setUpStores();
    first.magma.addNewUseCase(1, 'enterprise-attack');
    const created = first.magma.L1UseCases('enterprise-attack').at(-1)!;
    expect([created.inImpact, created.thrImpact, created.outImpact]).toEqual([100, 0, 0]);
    const saved = saveFile(first.magma);
    expect(saved).not.toMatch(/nan/i);

    const second = await setUpStores();
    second.magma.importUseCases(readFile(saved));
    const loaded = second.magma.getUseCaseById(created.id, 'enterprise-attack');
    expect(loaded?.risk).toBeCloseTo(created.risk!);
  });

  it('loads files saved by older versions, which could contain .nan for empty impacts', async () => {
    const { magma } = await setUpStores();
    const result = magma.importUseCases(
      readFile(
        '- domain: enterprise-attack\n  level: 1\n  id: L1-1\n  name: old\n  inImpact: 100\n  thrImpact: .nan\n  outImpact: .nan\n',
      ),
    );
    expect(importSummary(result).text).toBe('Successful imports: 1. Failed imports: 0.');
    expect(magma.getUseCaseById('L1-1', 'enterprise-attack')?.risk).toBeCloseTo(100);
    expect(saveFile(magma)).not.toMatch(/nan/i);
  });
});

describe('magma store: renaming and deleting use cases', () => {
  let magma: MagmaStore;
  const domain = 'enterprise-attack';
  const parentsOf = (id: string, inDomain = domain) => magma.getUseCaseById(id, inDomain)?.parentIds;

  beforeEach(async () => {
    magma = (await setUpStores()).magma;
    magma.importUseCases(readFile(readExample('magma/example.yaml')));
    magma.importUseCases([{ domain: 'mobile-attack', level: 3, id: 'M-1', name: 'm', parentIds: ['DOS-1'] }]);
  });

  it('moves the children along when an ID is renamed, within the same domain only', () => {
    const weightBefore = magma.getUseCaseById('DOS', domain)!.weight;
    expect(magma.renameUseCase(magma.getUseCaseById('DOS-1', domain)!.uid, 'DOS-A')).toBeNull();
    expect(parentsOf('DOS-1-A')).toEqual(['DOS-A']);
    expect(parentsOf('DOS-1-B')).toEqual(['DOS-A']);
    expect(magma.getUseCaseById('DOS', domain)!.weight).toBe(weightBefore);
    expect(parentsOf('M-1', 'mobile-attack')).toEqual(['DOS-1']);
  });

  it('refuses an empty ID, an ID that already exists, and renaming IN/THR, without changing anything', () => {
    const uid = magma.getUseCaseById('DOS-1', domain)!.uid;
    expect(magma.renameUseCase(uid, 'FIN-1')).toContain('already exists');
    expect(magma.renameUseCase(uid, '  ')).toContain('cannot be empty');
    expect(magma.renameUseCase(magma.getUseCaseById('IN', domain)!.uid, 'IN2')).toContain('cannot be renamed');
    expect(magma.getUseCaseById('DOS-1', domain)).toBeDefined();
    expect(parentsOf('DOS-1-A')).toEqual(['DOS-1']);
  });

  it('refuses an ID with a space or a comma inside, because IDs are references (parents, Excel lists)', () => {
    const uid = magma.getUseCaseById('DOS-1', domain)!.uid;
    expect(magma.renameUseCase(uid, 'DOS 2')).toBe('An ID cannot contain spaces or commas.');
    expect(magma.renameUseCase(uid, 'DOS,2')).toBe('An ID cannot contain spaces or commas.');
    expect(magma.getUseCaseById('DOS-1', domain)).toBeDefined();
  });

  it('renames several use cases in one go, also to an ID another one of them gives up, with their children', () => {
    const uid = (id: string) => magma.getUseCaseById(id, domain)!.uid;
    expect(
      magma.renameUseCases([
        { uid: uid('DOS-1'), id: 'FIN-1' },
        { uid: uid('FIN-1'), id: 'FIN-2' },
      ]),
    ).toBeNull();
    expect(parentsOf('DOS-1-A')).toEqual(['FIN-1']);
    expect(parentsOf('FIN-1-A')).toEqual(['FIN-2']);
    expect(magma.getUseCaseById('DOS-1', domain)).toBeUndefined();
  });

  it('renames none of them when one new ID is refused', () => {
    const uid = (id: string) => magma.getUseCaseById(id, domain)!.uid;
    const tryRename = (ids: [string, string]) =>
      magma.renameUseCases([
        { uid: uid('DOS-1'), id: ids[0] },
        { uid: uid('FIN-1'), id: ids[1] },
      ]);
    expect(tryRename(['X-A', 'THR-1'])).toContain('already exists'); // THR-1 stays
    expect(tryRename(['X-A', 'X-A'])).toContain('already exists');
    expect(tryRename(['X-A', 'X B'])).toBe('An ID cannot contain spaces or commas.');
    expect(magma.getUseCaseById('DOS-1', domain)).toBeDefined();
    expect(magma.getUseCaseById('FIN-1', domain)).toBeDefined();
  });

  it('trims spaces around a new ID', () => {
    expect(magma.renameUseCase(magma.getUseCaseById('DOS-1', domain)!.uid, '  DOS-B ')).toBeNull();
    expect(parentsOf('DOS-1-A')).toEqual(['DOS-B']);
  });

  it('keeps the children when their parent is deleted (they lose their parent)', () => {
    magma.removeUseCaseByUid(magma.getUseCaseById('DOS-1', domain)!.uid);
    expect(parentsOf('DOS-1-A')).toEqual(['DOS-1']);
    expect(magma.getUseCaseById('DOS', domain)!.weight).toBe(0);
  });

  it('moves every use case that names a renamed parent along, also one on the wrong level', () => {
    magma.importUseCases([{ domain, level: 3, id: 'W', name: 'w', parentIds: ['DOS'] }]); // an L3 directly under an L1
    magma.renameUseCase(magma.getUseCaseById('DOS', domain)!.uid, 'DDOS');
    expect([parentsOf('DOS-1'), parentsOf('W')]).toEqual([['DDOS'], ['DDOS']]);
    magma.renameUseCases([{ uid: magma.getUseCaseById('DDOS', domain)!.uid, id: 'DOS' }]);
    expect([parentsOf('DOS-1'), parentsOf('W')]).toEqual([['DOS'], ['DOS']]);
  });

  // Recalculating once per deleted use case made deleting a whole sheet of 1,000 rules take seconds.
  it('deletes several use cases with one recalculation, and their parents lose them', () => {
    const recalculations = vi.spyOn(magma, 'recalculateAll');
    magma.removeUseCasesByUid(['DOS-1-A', 'DOS-1-B'].map((id) => magma.getUseCaseById(id, domain)!.uid));
    expect(recalculations).toHaveBeenCalledTimes(1);
    expect(magma.getUseCaseById('DOS-1-A', domain)).toBeUndefined();
    expect(magma.getUseCaseById('DOS-1-B', domain)).toBeUndefined();
    expect(magma.getUseCaseById('DOS-1', domain)!.weight).toBe(0);
  });

  it('deletes all use cases of the open sheet in one domain with one recalculation, apart from IN and THR', () => {
    magma.activeTab = 'L1';
    const recalculations = vi.spyOn(magma, 'recalculateAll');
    magma.removeActiveTabUseCases(domain);
    expect(recalculations).toHaveBeenCalledTimes(1);
    expect(magma.L1UseCases(domain).map((useCase) => useCase.id)).toEqual(['IN', 'THR']);
    expect(parentsOf('DOS-1')).toEqual(['DOS']); // the level below is kept and loses its parent
  });
});

describe('magma store: loading a MaGMa file', () => {
  let magma: MagmaStore;
  const ids = () =>
    magma.useCases
      .filter((u) => !u.permanent)
      .map((u) => `${u.domain.split('-')[0]}:${u.id}`)
      .sort();

  beforeEach(async () => {
    magma = (await setUpStores()).magma;
    magma.importUseCases(readFile(readExample('magma/example.yaml')));
    magma.importUseCases([{ domain: 'mobile-attack', level: 3, id: 'M-1', name: 'm' }]);
  });

  it('replaces only the domains that are in the file, and keeps the others', () => {
    magma.loadUseCases([{ domain: 'mobile-attack', level: 3, id: 'M-2', name: 'new' }]);
    expect(ids()).toContain('enterprise:DOS');
    expect(ids()).toContain('mobile:M-2');
    expect(ids()).not.toContain('mobile:M-1');
  });

  it('shows a loaded file in its own order: the sheets are no longer sorted', () => {
    magma.sheetSorts.L3 = { field: 'implementation', direction: 'descending' };
    magma.loadUseCases([{ domain: 'mobile-attack', level: 3, id: 'M-2', name: 'new' }]);
    expect(magma.sheetSorts).toEqual({});
  });

  it('saves the use cases by domain, then by ID with the numbers in them in order (L3-2 before L3-10)', () => {
    magma.loadUseCases(
      ['L3-10', 'L3-2', 'L3-1', 'DOS-1-B', 'DOS-1-A'].map((id) => ({
        domain: 'mobile-attack',
        level: 3,
        id,
        name: id,
      })),
    );
    const saved = magma.domainSortedUseCases
      .filter((u) => u.domain === 'mobile-attack' && u.level === 3)
      .map((u) => u.id);
    expect(saved).toEqual(['DOS-1-A', 'DOS-1-B', 'L3-1', 'L3-2', 'L3-10']);
  });

  it('restores the saved domains from a file saved by PRISMA, and keeps domains the file has no use cases for', () => {
    const saved = saveFile(magma); // Contains IN/THR for every domain, and use cases for Enterprise and Mobile.
    const before = ids();
    magma.addNewUseCase(3, 'enterprise-attack');
    magma.addNewUseCase(3, 'ics-attack');
    magma.loadUseCases(readFile(saved));
    expect(magmaFileDomains(readFile(saved))).toEqual(['enterprise-attack', 'mobile-attack']);
    expect(ids()).toEqual([...before, 'ics:L3-1'].sort());
  });
});

describe('magma store: L3 use cases per technique (heatmap)', () => {
  it('counts use cases on sub-techniques for the parent technique, within the given domain only', async () => {
    const { magma } = await setUpStores();
    magma.importUseCases([
      { domain: 'enterprise-attack', level: 3, id: 'PARENT', name: 'p', attackTechniqueId: 'T1566' },
      { domain: 'enterprise-attack', level: 3, id: 'SUB', name: 's', attackTechniqueId: 'T1566.001' },
      { domain: 'enterprise-attack', level: 3, id: 'OTHER', name: 'o', attackTechniqueId: 'T1059' },
      { domain: 'mobile-attack', level: 3, id: 'MOBILE', name: 'm', attackTechniqueId: 'T1660' },
    ]);
    const ids = (techniqueId: string, domain: string) =>
      magma
        .l3UseCasesForTechnique(techniqueId, domain)
        .map((u) => u.id)
        .sort();
    expect(ids('T1566', 'enterprise-attack')).toEqual(['PARENT', 'SUB']);
    expect(ids('T1660', 'enterprise-attack')).toEqual([]);
    expect(ids('T1660', 'mobile-attack')).toEqual(['MOBILE']);
  });
});

describe('magma store: unsaved changes (for the leave-page prompt)', () => {
  it('has unsaved changes only when the use cases changed since they were last loaded or saved', async () => {
    const { magma } = await setUpStores();
    const domain = 'enterprise-attack';
    expect(magma.hasUnsavedChanges()).toBe(false); // only the permanent IN and THR use cases
    magma.addNewUseCase(1, domain);
    expect(magma.hasUnsavedChanges()).toBe(true);

    magma.loadUseCases(readFile(readExample('magma/example.yaml')));
    expect(magma.hasUnsavedChanges()).toBe(false);
    const useCase = magma.L3UseCases(domain)[0];
    const implementation = useCase.implementation;
    magma.updateUseCase(useCase.uid, { implementation: 12 }, domain);
    expect(magma.hasUnsavedChanges()).toBe(true);
    magma.updateUseCase(useCase.uid, { implementation }, domain);
    expect(magma.hasUnsavedChanges()).toBe(false); // changed back

    magma.updateUseCase(useCase.uid, { implementation: 12 }, domain);
    magma.markAsSaved();
    expect(magma.hasUnsavedChanges()).toBe(false);
  });

  it('does not count values that PRISMA calculates, such as a visibility from another DeTT&CT file', async () => {
    const { tactics, magma } = await setUpStores();
    magma.loadUseCases(readFile(readExample('magma/example.yaml')));
    const saved = saveFile(magma);
    tactics.processDettectYaml(parse(readExample('dettect/enterprise_large.yaml')));
    magma.updateAllL3UseCasesBasedOnDettectVisibility();
    expect(saveFile(magma)).not.toBe(saved); // the calculated values did change
    expect(magma.hasUnsavedChanges()).toBe(false);
  });
});

describe('magma store: grandchildren (the L3 use cases under an L1 use case)', () => {
  it('lists a rule once, also when two of its parents belong to the same L1 use case', async () => {
    const { magma } = await setUpStores();
    const domain = 'enterprise-attack';
    magma.importUseCases(readFile(readExample('magma/example.yaml')));
    magma.importUseCases([
      { domain, level: 2, id: 'DOS-2', name: 'Second DOS use case', parentIds: ['DOS'] },
      { domain, level: 3, id: 'DOS-X', name: 'Rule with two parents', parentIds: ['DOS-1', 'DOS-2'] },
    ]);
    const ids = magma.getGrandChildUseCases(magma.getUseCaseById('DOS', domain)!).map((useCase) => useCase.id);
    expect(ids.filter((id) => id === 'DOS-X')).toHaveLength(1);
    expect(ids).toContain('DOS-1-A');
  });
});

describe('magma store: undo and redo', () => {
  let magma: MagmaStore;
  let tactics: ReturnType<typeof tacticsStore>;
  const l3 = (id: string) => magma.L3UseCases('enterprise-attack').find((useCase) => useCase.id === id)!;

  beforeEach(async () => {
    ({ magma, tactics } = await setUpStores());
    magma.importUseCases(readFile(readExample('magma/example.yaml')));
    magma.activeTab = 'L3';
  });

  it('undoes a change, with the values that depend on it, and redoes it', () => {
    const before = { implementation: l3('DOS-1-A').implementation, weight: l3('DOS-1-A').weight };
    magma.recordStep('Implementation of DOS-1-A', 'DOS-1-A:implementation');
    magma.updateUseCase(l3('DOS-1-A').uid, { implementation: '10' }, 'enterprise-attack');
    const changed = { implementation: l3('DOS-1-A').implementation, weight: l3('DOS-1-A').weight };
    expect(magma.undoDescription).toBe('Implementation of DOS-1-A');
    magma.undo();
    expect({ implementation: l3('DOS-1-A').implementation, weight: l3('DOS-1-A').weight }).toEqual(before);
    expect(magma.redoDescription).toBe('Implementation of DOS-1-A');
    magma.redo();
    expect({ implementation: l3('DOS-1-A').implementation, weight: l3('DOS-1-A').weight }).toEqual(changed);
  });

  it('makes one step of typing in one cell, until the cell is left', () => {
    const uid = l3('DOS-1-A').uid;
    for (const value of ['1', '12', '123']) {
      magma.recordStep('Name of DOS-1-A', `${uid}:name`);
      magma.updateUseCase(uid, { name: value }, 'enterprise-attack');
    }
    magma.endStepGroup();
    magma.recordStep('Name of DOS-1-A', `${uid}:name`);
    magma.updateUseCase(uid, { name: '1234' }, 'enterprise-attack');
    magma.undo();
    expect(l3('DOS-1-A').name).toBe('123');
    magma.undo();
    expect(l3('DOS-1-A').name).toBe('L3 OUT UC DOS');
    expect(magma.undoDescription).toBeNull();
  });

  it('undoes adding and deleting a use case', () => {
    const count = () => magma.L3UseCases('enterprise-attack').length;
    const start = count();
    magma.recordStep('Delete DOS-1-A');
    magma.removeUseCaseByUid(l3('DOS-1-A').uid);
    magma.recordStep('Add a use case to L3');
    magma.addNewUseCase(3, 'enterprise-attack');
    expect(count()).toBe(start);
    magma.undo();
    magma.undo();
    expect(count()).toBe(start);
    expect(l3('DOS-1-A')).toBeDefined();
  });

  it('skips a step that changed nothing, such as a refused rename', () => {
    magma.recordStep('Effectiveness of DOS-1-A');
    magma.updateUseCase(l3('DOS-1-A').uid, { effectiveness: '5' }, 'enterprise-attack');
    magma.recordStep('ID of DOS-1-B');
    expect(magma.renameUseCase(l3('DOS-1-B').uid, 'DOS-1-A')).not.toBeNull(); // refused: the ID exists
    magma.undo();
    expect(l3('DOS-1-A').effectiveness).not.toBe('5');
  });

  it('shows the sheet and domain where the undone change was made', () => {
    tactics.setDomain('enterprise-attack');
    magma.activeTab = 'L2';
    magma.recordStep('Description of DOS-1');
    const dos1 = magma.L2UseCases('enterprise-attack').find((useCase) => useCase.id === 'DOS-1')!;
    magma.updateUseCase(dos1.uid, { description: 'changed' }, 'enterprise-attack');
    magma.activeTab = 'Heatmap';
    tactics.setDomain('mobile-attack');
    magma.undo();
    expect([magma.activeTab, tactics.domain]).toEqual(['L2', 'enterprise-attack']);
  });

  it('forgets the history when a MaGMa file is loaded', () => {
    magma.recordStep('Name of DOS-1-A');
    magma.loadUseCases(readFile(readExample('magma/example.yaml')));
    expect(magma.undoDescription).toBeNull();
  });
});
