import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import fs from 'node:fs';
import { parse } from 'yaml';
import { tacticsStore } from '../tactics';
import { isDetectable } from '@/domain/attack/visibility';

const catalog = JSON.parse(fs.readFileSync('public/tactics_and_techniques_by_domain.json', 'utf8'));
const readExample = (name: string) => parse(fs.readFileSync(`../examples/${name}`, 'utf8'));

describe('tactics store: processDettectYaml', () => {
  let store: ReturnType<typeof tacticsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = tacticsStore();
    const copy = structuredClone(catalog);
    store.enterprise = copy.enterprise;
    store.mobile = copy.mobile;
    store.ics = copy.ics;
  });

  it('gives every detectable technique and sub-technique exactly 100% with the maximum-quality file', () => {
    store.processDettectYaml(readExample('dettect/enterprise_max_quality.yaml'));
    for (const tactic of store.enterprise!.tactics) {
      for (const technique of tactic.techniques) {
        if (isDetectable(technique)) {
          expect(technique.visibility_ratio, `${technique.external_id} in ${tactic.name}`).toBe(1);
        }
        for (const sub of technique.sub_techniques ?? []) {
          if (sub.data_components.length > 0) {
            expect(sub.visibility_ratio, sub.external_id).toBe(1);
          }
        }
      }
    }
  });
});

describe('tactics store: loading a DeTT&CT file safely', () => {
  let store: ReturnType<typeof tacticsStore>;
  const ratio = (id: string) =>
    store.enterprise!.tactics.flatMap((t) => t.techniques).find((t) => t.external_id === id)?.visibility_ratio;
  const dettect = (dataSources: unknown[]) => ({
    version: 1.1,
    file_type: 'data-source-administration',
    domain: 'enterprise-attack',
    data_sources: dataSources,
  });
  const dataSource = (name: string, deviceCompleteness: unknown) => ({
    data_source_name: name,
    data_source: [{ applicable_to: ['all'], data_quality: { device_completeness: deviceCompleteness } }],
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    store = tacticsStore();
    const copy = structuredClone(catalog);
    store.enterprise = copy.enterprise;
    store.mobile = copy.mobile;
    store.ics = copy.ics;
    store.processDettectYaml(readExample('dettect/enterprise_large.yaml'));
  });

  it('changes nothing when a file has a problem', () => {
    const before = ratio('T1595');
    expect(before).toBeGreaterThan(0);
    expect(() => store.processDettectYaml(dettect([dataSource('Process Creation', 50)]))).toThrow(
      'device_completeness "50" is not valid',
    );
    expect(() => store.processDettectYaml(readExample('magma/example.yaml'))).toThrow(
      'not a DeTT&CT data source administration file',
    );
    expect(() => store.processDettectYaml(null)).toThrow('not a DeTT&CT data source administration file');
    expect(ratio('T1595')).toBe(before);
    expect(store.domain).toBe('enterprise-attack');
  });

  it('ignores data sources that ATT&CK does not know, and reports them', () => {
    const result = store.processDettectYaml(
      dettect([dataSource('Network Traffic Content', 5), dataSource('Typo Source', 5)]),
    );
    expect(result.unknownDataSources).toEqual(['Typo Source']);
    expect(result.dataSources).toBe(1); // the known ones, which were applied
    expect(ratio('T1595')).toBeGreaterThan(0); // Active Scanning is visible through Network Traffic Content.
  });

  it('forgets the scores of the previous file', () => {
    const quality = (name: string) => store.enterprise!.data_components.find((c) => c.name === name)!.quality;
    store.processDettectYaml(dettect([dataSource('Process Creation', 3), dataSource('Command Execution', 4)]));
    expect(quality('Process Creation').device_completeness).toBe(3);

    // The next file has no device completeness for Process Creation (which counts as 0), and no Command Execution.
    store.processDettectYaml(
      dettect([{ data_source_name: 'Process Creation', data_source: [{ data_quality: { retention: 2 } }] }]),
    );
    expect(quality('Process Creation').device_completeness).toBeNull();
    expect(quality('Process Creation').retention).toBe(2);
    expect(quality('Command Execution').device_completeness).toBeNull();
  });

  it('remembers the ATT&CK version of the catalog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(catalog) })),
    );
    await store.fetchTactics();
    vi.unstubAllGlobals();
    expect(store.attackVersion).toBe('17.1');
  });

  it('passes the error on when the ATT&CK data cannot be loaded (App.vue shows the message)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' })),
    );
    await expect(store.fetchTactics()).rejects.toThrow('HTTP 404 Not Found');
    vi.unstubAllGlobals();
    expect(store.dataLoaded).toBe(true);
  });
});

describe('tactics store: techniques of the hovered and selected groups and data components', () => {
  it('collects the techniques of the marked items, each technique once', () => {
    setActivePinia(createPinia());
    const store = tacticsStore();
    store.enterprise = structuredClone(catalog).enterprise;
    const [group1, group2] = store.enterprise!.groups;
    const [component] = store.enterprise!.data_components;
    group1.hovered = true;
    group1.selected = true;
    group2.selected = true;
    group2.selectedInMagmaHeatmap = true;
    component.hovered = true;
    component.selected = true;

    const techniquesOf = (...items: { techniques: string[] }[]) => [
      ...new Set(items.flatMap((item) => item.techniques)),
    ];
    expect([...store.hoveredGroupsTechniquesSet]).toEqual(techniquesOf(group1));
    expect([...store.selectedGroupsTechniquesSet]).toEqual(techniquesOf(group1, group2));
    expect([...store.selectedGroupsTechniquesSetMagmaHeatmap]).toEqual(techniquesOf(group2));
    expect([...store.hoveredComponentsTechniquesSet]).toEqual(techniquesOf(component));
    expect([...store.selectedComponentsTechniquesSet]).toEqual(techniquesOf(component));
    expect(store.selectedGroupsTechniquesSet.size).toBeGreaterThan(0);

    // A domain without catalog data has none.
    store.setDomain('ics-attack');
    store.ics = undefined;
    expect(store.hoveredGroupsTechniquesSet.size).toBe(0);
  });
});

describe('tactics store: the technique options of the L3 sheet', () => {
  it('lists every technique and sub-technique of the domain once, by ID, with the parent name before a sub-technique', () => {
    setActivePinia(createPinia());
    const store = tacticsStore();
    store.enterprise = structuredClone(catalog).enterprise;
    const options = store.techniqueOptions;
    expect(options).toHaveLength(679); // 211 techniques and 468 sub-techniques
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
    expect(options.find((option) => option.id === 'T1566')?.name).toBe('Phishing');
    expect(options.find((option) => option.id === 'T1566.001')?.name).toBe('Phishing: Spearphishing Attachment');
    const ids = options.map((option) => option.id);
    expect(ids.indexOf('T1566')).toBe(ids.indexOf('T1566.001') - 1);
  });
});
