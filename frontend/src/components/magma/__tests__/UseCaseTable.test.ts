import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import fs from 'node:fs';
import { tacticsStore } from '@/stores/tactics';
import { magmaStore } from '@/stores/magma';
import UseCaseTable from '../UseCaseTable.vue';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn(() => Promise.resolve({})) } }));

const catalog = JSON.parse(fs.readFileSync('public/tactics_and_techniques_by_domain.json', 'utf8'));
const domain = 'enterprise-attack';

// Shows the table of one level, with the default use cases plus one new use case on that level.
async function showTable(level: 'L1' | 'L2' | 'L3') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const tactics = tacticsStore();
  tactics.enterprise = structuredClone(catalog.enterprise);
  const magma = magmaStore();
  magma.initializeDefaultUseCases();
  magma.addNewUseCase(Number(level[1]), domain);
  magma.activeTab = level;
  const table = mount(UseCaseTable, { global: { plugins: [pinia] } });
  const headers = () =>
    table
      .findAll('thead th')
      .slice(1)
      .map((th) => th.text()); // without the delete-all column
  const cell = (row: number, header: string) =>
    table
      .findAll('tbody tr')
      .at(row)!
      .findAll('td')
      .at(headers().indexOf(header) + 1)!;
  return { magma, table, headers, cell };
}

describe('UseCaseTable', () => {
  it('shows the columns of the active level', async () => {
    expect((await showTable('L1')).headers()).toEqual([
      'ID',
      'Use Case Name',
      'Description',
      'L2 UC Related',
      'L3 UC Related',
      'Visibility %',
      'Implementation %',
      'Effectiveness %',
      'Weight %',
      'Potential %',
      'IN Impact %',
      'THR Impact %',
      'OUT Impact %',
      'Risk',
    ]);
    expect((await showTable('L2')).headers()).toEqual([
      'ID',
      'Use Case Name',
      'Description',
      'Parent Use Case',
      'L3 UC Related',
      'Visibility %',
      'Implementation %',
      'Effectiveness %',
      'Weight %',
      'Potential %',
    ]);
    expect((await showTable('L3')).headers()).toEqual([
      'ID',
      'Use Case Name',
      'Description',
      'Parent Use Case',
      'Data Source',
      'ATT&CK Technique',
      'Override',
      'Visibility %',
      'Implementation %',
      'Effectiveness %',
      'Weight %',
      'Potential %',
    ]);
  });

  it('locks the permanent IN and THR use cases, and marks impacts that do not add up to 100', async () => {
    const { table, magma, cell } = await showTable('L1');
    const rows = table.findAll('tbody tr').filter((row) => row.find('td.remove-col').exists()); // without the averages
    expect(rows.map((row) => row.find('button.remove-button').exists())).toEqual([false, false, true]);
    expect(cell(0, 'ID').find('textarea').attributes('disabled')).toBeDefined();
    expect(cell(0, 'IN Impact %').find('input').attributes('disabled')).toBeDefined();
    expect(cell(2, 'ID').find('textarea').attributes('disabled')).toBeUndefined();
    expect(cell(2, 'Visibility %').find('.uneditable').exists()).toBe(true); // calculated from the levels below

    const useCase = magma.L1UseCases(domain).at(-1)!;
    magma.updateUseCase(useCase.uid, { inImpact: 50, thrImpact: 20, outImpact: 30 } as never, domain);
    await table.vm.$nextTick();
    expect(cell(2, 'IN Impact %').find('input').element.style.backgroundColor).toBe('white');
    magma.updateUseCase(useCase.uid, { outImpact: 40 } as never, domain);
    await table.vm.$nextTick();
    expect(cell(2, 'IN Impact %').find('input').element.style.backgroundColor).toBe('crimson');
  });

  it('hatches the impacts and the risk of IN and THR in grey, without a value: they do not apply', async () => {
    const { cell } = await showTable('L1');
    for (const header of ['IN Impact %', 'THR Impact %', 'OUT Impact %', 'Risk']) {
      const input = cell(0, header).find('input').element as HTMLInputElement;
      expect([header, input.style.backgroundImage.startsWith('repeating-linear-gradient'), input.value]).toEqual([
        header,
        true,
        '',
      ]);
    }
    expect((cell(2, 'IN Impact %').find('input').element as HTMLInputElement).style.backgroundImage).toBe('');
  });

  it('lets the visibility of an L3 use case be edited, unless it comes from its technique', async () => {
    const { table, magma, cell } = await showTable('L3');
    const visibility = () => cell(0, 'Visibility %').find('input').attributes('disabled');
    expect(visibility()).toBeUndefined();
    const useCase = magma.L3UseCases(domain)[0];
    magma.updateUseCase(useCase.uid, { attackTechniqueId: 'T1059' }, domain);
    await table.vm.$nextTick();
    expect(visibility()).toBeDefined();
    magma.updateUseCase(useCase.uid, { visibilityFromAttackTechniqueOverride: true }, domain);
    await table.vm.$nextTick();
    expect(visibility()).toBeUndefined();
  });

  it('sets the technique of an L3 use case with the technique field, including sub-techniques', async () => {
    const { magma, cell } = await showTable('L3');
    const field = () => cell(0, 'ATT&CK Technique');
    expect(field().find('.current').text()).toBe('None');
    await field().find('.current').trigger('click');
    await field().find('input').setValue('1566.001');
    await field().find('input').trigger('keydown', { key: 'Enter' });
    expect(magma.L3UseCases(domain)[0].attackTechniqueId).toBe('T1566.001');
    expect(field().find('.current').text()).toBe('T1566.001 Phishing: Spearphishing Attachment');
    expect(cell(0, 'Visibility %').find('input').attributes('disabled')).toBeDefined(); // it comes from the technique now
  });

  it('sets the parent of a use case with the parent field, and marks a missing parent red', async () => {
    const { magma, cell } = await showTable('L2');
    const field = () => cell(0, 'Parent Use Case');
    expect(field().find('.current').text()).toBe('None');
    expect((field().find('.option-picker').element as HTMLElement).style.backgroundColor).toBe('crimson');
    await field().find('.current').trigger('click');
    await field().find('input').setValue('THR');
    await field().find('input').trigger('keydown', { key: 'Enter' });
    expect(magma.L2UseCases(domain)[0].parentIds).toEqual(['THR']);
    expect(field().find('.current').text()).toBe('THR Cumulative THROUGH risk');
    expect((field().find('.option-picker').element as HTMLElement).style.backgroundColor).toBe('white');
    await field().find('.clear').trigger('click');
    expect(magma.L2UseCases(domain)[0].parentIds).toEqual(['none']);
  });

  it('explains every column, and the delete buttons, when hovering', async () => {
    for (const level of ['L1', 'L2', 'L3'] as const) {
      const { table } = await showTable(level);
      const [deleteAll, ...headers] = table.findAll('thead th');
      expect(deleteAll.attributes('aria-description')).toBe(`Delete all ${level} use cases`);
      for (const header of headers) {
        expect(header.attributes('aria-description'), `${level} ${header.text()}`).toMatch(/\w{3,}/);
      }
      expect(table.find('tbody .remove-button').attributes('aria-description')).toBe('Delete this use case');
    }
  });

  it('switches the override with the switch in its cell', async () => {
    const { magma, cell } = await showTable('L3');
    const useCase = magma.L3UseCases(domain)[0];
    magma.updateUseCase(useCase.uid, { attackTechniqueId: 'T1059' }, domain);
    const toggle = () => cell(0, 'Override').find('.override-toggle input');
    expect((toggle().element as HTMLInputElement).checked).toBe(false);
    await toggle().setValue(true);
    expect(magma.L3UseCases(domain)[0].visibilityFromAttackTechniqueOverride).toBe(true);
    expect(cell(0, 'Visibility %').find('input').attributes('disabled')).toBeUndefined();
    await toggle().setValue(false);
    expect(magma.L3UseCases(domain)[0].visibilityFromAttackTechniqueOverride).toBe(false);
    expect(cell(0, 'Visibility %').find('input').attributes('disabled')).toBeDefined();
  });

  it('keeps each row with its use case when a row above it is deleted', async () => {
    const { table, magma } = await showTable('L2');
    magma.addNewUseCase(2, domain);
    await table.vm.$nextTick();
    const [first, second] = magma.L2UseCases(domain);
    const rowOf = (id: string) =>
      table
        .findAll('tbody tr')
        .find(
          (row) => row.find('textarea').exists() && (row.find('textarea').element as HTMLTextAreaElement).value === id,
        )?.element;
    const secondRow = rowOf(second.id);
    magma.removeUseCaseByUid(first.uid);
    await table.vm.$nextTick();
    expect(rowOf(second.id)).toBe(secondRow);
  });

  it('ends editing with Enter in the ID, name and data source, but adds a line with Enter in the description', async () => {
    const { cell } = await showTable('L3');
    const pressEnter = (header: string) => {
      const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
      cell(0, header).find('textarea').element.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(['ID', 'Use Case Name', 'Data Source', 'Description'].map(pressEnter)).toEqual([true, true, true, false]);
  });

  it('turns line breaks into spaces in the name and data source, and keeps them in the description', async () => {
    const { cell, magma } = await showTable('L3');
    await cell(0, 'Use Case Name').find('textarea').setValue('Pasted\nname');
    await cell(0, 'Data Source').find('textarea').setValue('Windows\r\nevents');
    await cell(0, 'Description').find('textarea').setValue('First line\nSecond line');
    const useCase = magma.L3UseCases(domain)[0];
    expect([useCase.name, useCase.dataSource, useCase.description]).toEqual([
      'Pasted name',
      'Windows events',
      'First line\nSecond line',
    ]);
  });

  it('renames a use case when its ID field is left, and refuses a space in the ID', async () => {
    const { cell, magma } = await showTable('L2');
    const uid = magma.L2UseCases(domain)[0].uid;
    const id = () => cell(0, 'ID').find('textarea');
    await id().setValue('NEW-1');
    await id().trigger('change');
    expect(magma.getUseCaseByUid(uid)!.id).toBe('NEW-1');
    await id().setValue('NEW 2');
    await id().trigger('change');
    expect(magma.getUseCaseByUid(uid)!.id).toBe('NEW-1');
    expect((id().element as HTMLTextAreaElement).value).toBe('NEW-1');
  });

  it('shows the averages only on L1', async () => {
    expect((await showTable('L1')).table.text()).toContain('Averages');
    expect((await showTable('L2')).table.text()).not.toContain('Averages');
  });

  it('sorts by a column when its header is clicked: ascending, descending, then the order of the file', async () => {
    const { table, magma, headers } = await showTable('L2');
    magma.addNewUseCase(2, domain);
    magma.addNewUseCase(2, domain);
    const [first, second, third] = magma.L2UseCases(domain);
    magma.updateUseCase(first!.uid, { name: 'beta' }, domain);
    magma.updateUseCase(second!.uid, { name: 'Alpha' }, domain);
    magma.updateUseCase(third!.uid, { name: 'gamma' }, domain);
    await table.vm.$nextTick();
    const names = () =>
      table.findAll('tbody tr').flatMap((row) => {
        const field = row.findAll('textarea').at(1);
        return field ? [(field.element as HTMLTextAreaElement).value] : [];
      });
    const header = () =>
      table.findAll('thead th').at(headers().findIndex((text) => text.startsWith('Use Case Name')) + 1)!;
    expect(names()).toEqual(['beta', 'Alpha', 'gamma']);
    expect(header().attributes('aria-sort')).toBe('none');
    await header().trigger('click');
    expect(names()).toEqual(['Alpha', 'beta', 'gamma']);
    expect(header().attributes('aria-sort')).toBe('ascending');
    expect(header().find('.sort-arrow').text()).toBe('▲');
    await header().trigger('click');
    expect(names()).toEqual(['gamma', 'beta', 'Alpha']);
    expect(header().find('.sort-arrow').text()).toBe('▼');
    await header().trigger('click');
    expect(names()).toEqual(['beta', 'Alpha', 'gamma']);
    expect(header().attributes('aria-sort')).toBe('none');
    expect(magma.L2UseCases(domain).map((useCase) => useCase.name)).toEqual(['beta', 'Alpha', 'gamma']); // the file order
  });

  it('keeps IN and THR on top of a sorted L1 sheet', async () => {
    const { table, headers } = await showTable('L1');
    const header = table.findAll('thead th').at(headers().indexOf('ID') + 1)!;
    await header.trigger('click');
    await header.trigger('click'); // descending: the new use case would come before IN and THR without pinning
    const ids = table
      .findAll('tbody tr')
      .flatMap((row) =>
        row.find('textarea').exists() ? [(row.find('textarea').element as HTMLTextAreaElement).value] : [],
      );
    expect(ids.slice(0, 2)).toEqual(['IN', 'THR']);
  });

  it('keeps a row in its place while it is being edited, and sorts it when it is left', async () => {
    const { table, magma, headers } = await showTable('L2');
    magma.addNewUseCase(2, domain);
    const [first, second] = magma.L2UseCases(domain);
    magma.updateUseCase(first!.uid, { name: 'a' }, domain);
    magma.updateUseCase(second!.uid, { name: 'b' }, domain);
    await table.vm.$nextTick();
    await table
      .findAll('thead th')
      .at(headers().indexOf('Use Case Name') + 1)!
      .trigger('click');
    const rows = () => table.findAll('tbody tr').filter((row) => row.find('textarea').exists());
    const nameOf = (row: typeof rows extends () => (infer R)[] ? R : never) =>
      (row.findAll('textarea').at(1)!.element as HTMLTextAreaElement).value;
    await rows()[0]!.trigger('focusin');
    magma.updateUseCase(first!.uid, { name: 'c' }, domain);
    await table.vm.$nextTick();
    expect(rows().map(nameOf)).toEqual(['c', 'b']); // still on top while editing
    await rows()[0]!.trigger('focusout');
    expect(rows().map(nameOf)).toEqual(['b', 'c']);
  });

  it('hatches the delete cells of IN and THR in red: they cannot be deleted', async () => {
    const { table } = await showTable('L1');
    const deleteCells = table.findAll('tbody td.remove-col').slice(0, 3);
    expect(deleteCells.map((cell) => cell.classes().includes('not-deletable'))).toEqual([true, true, false]);
    expect(deleteCells.map((cell) => cell.find('.remove-button').exists())).toEqual([false, false, true]);
  });
});
