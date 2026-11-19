import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import fs from 'node:fs';
import { tacticsStore } from '@/stores/tactics';
import { magmaStore } from '@/stores/magma';
import Swal from 'sweetalert2';
import UseCaseTable from '../UseCaseTable.vue';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn(() => Promise.resolve({})) } }));

const catalog = JSON.parse(fs.readFileSync('public/tactics_and_techniques_by_domain.json', 'utf8'));
const domain = 'enterprise-attack';

// Shows the table of one level, with the default use cases plus one new use case on that level. A table that is
// attached to the page can have the cursor in its fields (unmount it at the end of the test).
async function showTable(level: 'L1' | 'L2' | 'L3', attach = false) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const tactics = tacticsStore();
  tactics.enterprise = structuredClone(catalog.enterprise);
  const magma = magmaStore();
  magma.initializeDefaultUseCases();
  magma.addNewUseCase(Number(level[1]), domain);
  magma.activeTab = level;
  const table = mount(UseCaseTable, { global: { plugins: [pinia] }, attachTo: attach ? document.body : undefined });
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
  it('shows the columns of the active level, their titles on one line without a % sign', async () => {
    expect((await showTable('L1')).headers()).toEqual([
      'ID',
      'Use Case Name',
      'Description',
      'L2 UCs',
      'L3 UCs',
      'Visibility',
      'Implementation',
      'Effectiveness',
      'Weight',
      'Potential',
      'IN Impact',
      'THR Impact',
      'OUT Impact',
      'Risk',
    ]);
    expect((await showTable('L2')).headers()).toEqual([
      'ID',
      'Use Case Name',
      'Description',
      'Parent Use Case',
      'L3 UCs',
      'Visibility',
      'Implementation',
      'Effectiveness',
      'Weight',
      'Potential',
    ]);
    expect((await showTable('L3')).headers()).toEqual([
      'ID',
      'Use Case Name',
      'Description',
      'Parent Use Case',
      'Data Source',
      'ATT&CK Technique',
      'Override',
      'Visibility',
      'Implementation',
      'Effectiveness',
      'Weight',
      'Potential',
    ]);
  });

  it('says in the hint of a column with percentages that it is in %', async () => {
    const { table } = await showTable('L3');
    const hintOf = (title: string) =>
      table
        .findAll('thead th')
        .find((th) => th.text() === title)!
        .attributes('aria-description');
    expect(hintOf('Visibility')).toMatch(/, in %/);
    expect(hintOf('Weight')).toMatch(/, in %/);
    expect(hintOf('Data Source')).not.toMatch(/%/);
  });

  it('locks the permanent IN and THR use cases, and marks impacts that do not add up to 100', async () => {
    const { table, magma, cell } = await showTable('L1');
    const rows = table.findAll('tbody tr').filter((row) => row.find('td.remove-col').exists()); // without the averages
    expect(rows.map((row) => row.find('button.remove-button').exists())).toEqual([false, false, true]);
    expect(cell(0, 'ID').find('textarea').attributes('disabled')).toBeDefined();
    expect(cell(0, 'IN Impact').find('input').attributes('disabled')).toBeDefined();
    expect(cell(2, 'ID').find('textarea').attributes('disabled')).toBeUndefined();
    expect(cell(2, 'Visibility').find('.uneditable').exists()).toBe(true); // calculated from the levels below

    const useCase = magma.L1UseCases(domain).at(-1)!;
    magma.updateUseCase(useCase.uid, { inImpact: 50, thrImpact: 20, outImpact: 30 } as never, domain);
    await table.vm.$nextTick();
    expect(cell(2, 'IN Impact').find('input').element.style.backgroundColor).toBe('white');
    magma.updateUseCase(useCase.uid, { outImpact: 40 } as never, domain);
    await table.vm.$nextTick();
    const impact = cell(2, 'IN Impact').find('input').element;
    expect([impact.style.backgroundColor, impact.style.color]).toEqual([
      'var(--color-invalid)',
      'var(--color-invalid-text)',
    ]);
  });

  it('hatches the impacts and the risk of IN and THR in grey, without a value: they do not apply', async () => {
    const { cell } = await showTable('L1');
    for (const header of ['IN Impact', 'THR Impact', 'OUT Impact', 'Risk']) {
      const input = cell(0, header).find('input').element as HTMLInputElement;
      expect([header, input.style.backgroundImage.startsWith('repeating-linear-gradient'), input.value]).toEqual([
        header,
        true,
        '',
      ]);
    }
    expect((cell(2, 'IN Impact').find('input').element as HTMLInputElement).style.backgroundImage).toBe('');
  });

  it('lets the visibility of an L3 use case be edited, unless it comes from its technique', async () => {
    const { table, magma, cell } = await showTable('L3');
    const visibility = () => cell(0, 'Visibility').find('input').attributes('disabled');
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
    expect(cell(0, 'Visibility').find('input').attributes('disabled')).toBeDefined(); // it comes from the technique now
  });

  it('sets the parent of a use case with the parent field, and marks a missing parent red', async () => {
    const { magma, cell } = await showTable('L2');
    const field = () => cell(0, 'Parent Use Case');
    expect(field().find('.current').text()).toBe('None');
    expect((field().find('.option-picker').element as HTMLElement).style.backgroundColor).toBe('var(--color-invalid)');
    expect(field().classes()).toContain('needs-attention'); // with a red line inside, see the styles
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
    expect(cell(0, 'Visibility').find('input').attributes('disabled')).toBeUndefined();
    await toggle().setValue(false);
    expect(magma.L3UseCases(domain)[0].visibilityFromAttackTechniqueOverride).toBe(false);
    expect(cell(0, 'Visibility').find('input').attributes('disabled')).toBeDefined();
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

  it('adds one, 5 or 10 empty use cases with the add buttons below the sheet, each as one undo step', async () => {
    const { table, magma } = await showTable('L2'); // one L2 use case: L2-1
    const ids = () => magma.L2UseCases(domain).map((useCase) => useCase.id);
    const button = (text: string) => table.findAll('.add-row button').find((found) => found.text() === text)!;
    await button('+ Add use case').trigger('click');
    expect(ids()).toEqual(['L2-1', 'L2-2']);
    await button('+5').trigger('click');
    expect(ids()).toEqual(['L2-1', 'L2-2', 'L2-3', 'L2-4', 'L2-5', 'L2-6', 'L2-7']);
    expect(magma.undoDescription).toBe('Add 5 use cases to L2');
    magma.undo();
    expect(ids()).toHaveLength(2);
    await button('+10').trigger('click');
    expect(ids()).toHaveLength(12);
    expect(button('+10').attributes('aria-label')).toBe('Add 10 empty use cases');
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

  it('hatches the delete cells of IN and THR: they cannot be deleted', async () => {
    const { table } = await showTable('L1');
    const deleteCells = table.findAll('tbody td.remove-col').slice(0, 3);
    expect(deleteCells.map((cell) => cell.classes().includes('not-deletable'))).toEqual([true, true, false]);
    expect(deleteCells.map((cell) => cell.find('.remove-button').exists())).toEqual([false, false, true]);
  });

  it('shows percentages with a decimal point in every browser language, and accepts a typed decimal comma', async () => {
    const { magma, cell } = await showTable('L3');
    const useCase = magma.L3UseCases(domain)[0]!;
    const implementation = () => cell(0, 'Implementation').find('input');
    expect(implementation().attributes('type')).toBe('text'); // a number field shows the browser's language, e.g. 0,00
    expect(implementation().attributes('inputmode')).toBe('decimal');
    await implementation().setValue('45,5');
    expect((implementation().element as HTMLInputElement).value).toBe('45.5');
    expect(magma.L3UseCases(domain)[0]!.implementation).toBe('45.5');
    await implementation().setValue('120');
    expect(magma.useCases.find((u) => u.uid === useCase.uid)!.implementation).toBe('100');
  });

  it('gives every sheet its own width, so the columns the sheets share are equally wide on each', async () => {
    for (const level of ['L1', 'L2', 'L3'] as const) {
      const { table } = await showTable(level);
      const headers = table.findAll('thead th').slice(1);
      const columnsWidth = headers.reduce((sum, th) => sum + parseFloat((th.element as HTMLElement).style.width), 0);
      const spacing = (headers.length + 2) * 2; // the 2px between the cells and at both ends, also around the delete column
      expect((table.find('table').element as HTMLElement).style.width, level).toBe(`${28 + columnsWidth + spacing}px`);
      expect(headers.slice(0, 3).map((th) => (th.element as HTMLElement).style.width)).toEqual([
        '86px',
        '155px',
        '258px',
      ]);
    }
  });

  it('makes one undo step of typing in a cell, described by the column and the use case', async () => {
    const { magma, cell } = await showTable('L3');
    const name = () => cell(0, 'Use Case Name').find('textarea');
    const before = (name().element as HTMLTextAreaElement).value;
    const id = magma.L3UseCases(domain)[0]!.id;
    await name().setValue('A');
    await name().setValue('AB');
    expect(magma.undoDescription).toBe(`Use Case Name of ${id}`);
    magma.undo();
    expect(magma.L3UseCases(domain)[0]!.name).toBe(before);
    expect(magma.undoDescription).toBeNull();
  });

  it('deletes a use case straight away, with a message that names it and can undo it', async () => {
    const { magma, table } = await showTable('L3');
    const count = magma.L3UseCases(domain).length;
    const id = magma.L3UseCases(domain)[0]!.id;
    let clickUndo = () => {};
    vi.mocked(Swal.fire).mockReturnValueOnce(
      new Promise(
        (resolve) => (clickUndo = () => resolve({ isConfirmed: true } as Awaited<ReturnType<typeof Swal.fire>>)),
      ),
    );
    await table.find('tbody .remove-button').trigger('click');
    expect(magma.L3UseCases(domain)).toHaveLength(count - 1);
    expect(Swal.fire).toHaveBeenLastCalledWith(
      expect.objectContaining({
        toast: true,
        titleText: `Deleted ${id}.`,
        confirmButtonText: expect.stringMatching(/^Undo \((Ctrl\+Z|⌘Z)\)$/),
      }),
    );
    clickUndo();
    await new Promise((resolve) => setTimeout(resolve));
    expect(magma.L3UseCases(domain)).toHaveLength(count);
  });

  it('names the child use cases that lose their parent in the message', async () => {
    const { magma, table } = await showTable('L2');
    const parent = magma.L2UseCases(domain).find((useCase) => !useCase.permanent)!;
    magma.addNewUseCase(3, domain);
    magma.updateUseCase(magma.L3UseCases(domain)[0]!.uid, { parentIds: [parent.id] }, domain);
    const row = table
      .findAll('tbody tr')
      .find(
        (tr) =>
          tr.find('textarea').exists() && (tr.find('textarea').element as HTMLTextAreaElement).value === parent.id,
      )!;
    await row.find('.remove-button').trigger('click');
    expect(Swal.fire).toHaveBeenLastCalledWith(
      expect.objectContaining({ text: `1 use case lost its parent: ${magma.L3UseCases(domain)[0]!.id}.` }),
    );
  });
});

// Three L3 use cases, and dragging over cells as a mouse does: press in one cell, enter others with the button held.
async function showThreeL3UseCases(attach = false) {
  const shown = await showTable('L3', attach);
  shown.magma.addNewUseCase(3, domain);
  shown.magma.addNewUseCase(3, domain);
  await shown.table.vm.$nextTick();
  const drag = async (from: [number, string], to: [number, string]) => {
    await shown.cell(...from).trigger('mousedown', { button: 0 });
    await shown.cell(...to).trigger('mouseenter', { buttons: 1 });
    window.dispatchEvent(new MouseEvent('mouseup'));
  };
  const selected = () => shown.table.findAll('td.cell-selected').length;
  const value = (row: number, header: string) =>
    (shown.cell(row, header).find('input, textarea').element as HTMLInputElement).value;
  return { ...shown, drag, selected, value, useCases: () => shown.magma.L3UseCases(domain) };
}

describe('UseCaseTable: selecting cells', () => {
  it('selects cells by dragging, and a change in one of them goes to all of them, as one undo step', async () => {
    const { drag, selected, cell, useCases, magma } = await showThreeL3UseCases();
    await drag([0, 'Implementation'], [2, 'Implementation']);
    expect(selected()).toBe(3);
    await cell(1, 'Implementation').find('input').setValue('90');
    expect(useCases().map((useCase) => useCase.implementation)).toEqual(['90', '90', '90']);
    expect(magma.undoDescription).toBe('Implementation of 3 use cases');
    magma.undo();
    expect(useCases().map((useCase) => useCase.implementation)).toEqual([null, null, null]);
  });

  it('sends a change in a block to all selected cells of the same kind: a percentage to the percentages', async () => {
    const { drag, selected, cell, useCases, magma } = await showThreeL3UseCases();
    await drag([0, 'Implementation'], [2, 'Effectiveness']);
    expect(selected()).toBe(6);
    await cell(1, 'Implementation').find('input').setValue('80');
    expect(useCases().map((useCase) => [useCase.implementation, useCase.effectiveness])).toEqual([
      ['80', '80'],
      ['80', '80'],
      ['80', '80'],
    ]);
    expect(magma.undoDescription).toBe('Implementation and Effectiveness of 3 use cases');
    magma.undo();
    expect(useCases().map((useCase) => [useCase.implementation, useCase.effectiveness])).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
  });

  it('sends a text to the selected texts only, on one line in the name and data source', async () => {
    const { drag, cell, useCases } = await showThreeL3UseCases();
    await drag([0, 'Use Case Name'], [1, 'Implementation']);
    await cell(0, 'Description').find('textarea').setValue('Checked\nby hand');
    expect(useCases().map((useCase) => [useCase.name, useCase.description, useCase.dataSource])).toEqual([
      ['Checked by hand', 'Checked\nby hand', 'Checked by hand'],
      ['Checked by hand', 'Checked\nby hand', 'Checked by hand'],
      ['', '', undefined], // a new use case has no data source yet
    ]);
    expect(useCases().map((useCase) => useCase.implementation)).toEqual([null, null, null]);
  });

  it('sends a choice in a search field in a block to its own column only', async () => {
    const { drag, table, useCases } = await showThreeL3UseCases();
    await drag([0, 'Parent Use Case'], [2, 'ATT&CK Technique']);
    const picker = table
      .findAllComponents({ name: 'OptionPicker' })
      .filter((found) => found.props('noun') === 'technique')[0]!;
    picker.vm.$emit('update:modelValue', 'T1566');
    expect(useCases().map((useCase) => useCase.attackTechniqueId)).toEqual(['T1566', 'T1566', 'T1566']);
    expect(useCases().map((useCase) => useCase.dataSource)).toEqual([undefined, undefined, undefined]);
  });

  it('gives the cell where a selection started the cursor, with its text selected, so typing replaces it', async () => {
    const { drag, cell, useCases, magma, table } = await showThreeL3UseCases(true);
    useCases().forEach((useCase, row) => magma.updateUseCase(useCase.uid, { name: `Rule ${row}` }, domain));
    await table.vm.$nextTick();
    const field = (row: number, header: string) =>
      cell(row, header).find('input, textarea').element as HTMLInputElement;
    await drag([2, 'Use Case Name'], [0, 'Description']); // upwards, pressed beside the text (no cursor yet)
    expect(document.activeElement).toBe(field(2, 'Use Case Name'));
    expect([field(2, 'Use Case Name').selectionStart, field(2, 'Use Case Name').selectionEnd]).toEqual([0, 6]);

    await cell(0, 'Implementation').trigger('mousedown', { button: 0 });
    window.dispatchEvent(new MouseEvent('mouseup'));
    await cell(2, 'Effectiveness').trigger('mousedown', { button: 0, shiftKey: true });
    expect(document.activeElement).toBe(field(0, 'Implementation'));
    table.unmount();
  });

  it('gives a search field where a selection started the cursor, so Delete or Backspace clears all of them', async () => {
    const { drag, cell, useCases, magma, table } = await showThreeL3UseCases(true);
    useCases().forEach((useCase) => magma.updateUseCase(useCase.uid, { attackTechniqueId: 'T1566' }, domain));
    await table.vm.$nextTick();
    await drag([0, 'ATT&CK Technique'], [2, 'ATT&CK Technique']);
    const field = cell(0, 'ATT&CK Technique').find('.current');
    expect(document.activeElement).toBe(field.element);
    await field.trigger('keydown', { key: 'Backspace' });
    expect(useCases().map((useCase) => useCase.attackTechniqueId)).toEqual(['none', 'none', 'none']);
    expect(magma.undoDescription).toBe('ATT&CK Technique of 3 use cases');
    magma.undo();
    expect(useCases().map((useCase) => useCase.attackTechniqueId)).toEqual(['T1566', 'T1566', 'T1566']);
    table.unmount();
  });

  // A press as the browser gets it, so it can be seen whether the cell keeps the browser from moving the cursor.
  const press = (element: Element) => {
    const event = new MouseEvent('mousedown', { button: 0, bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    return event;
  };

  it('gives a pressed cell of the selection the cursor, also beside its text: a selection always has one', async () => {
    const { drag, cell, table } = await showThreeL3UseCases(true);
    await drag([0, 'Use Case Name'], [2, 'Description']);
    const description = cell(1, 'Description').find('textarea').element as HTMLTextAreaElement;
    expect(press(cell(1, 'Description').find('.text-field').element).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(description);
    expect(press(description).defaultPrevented).toBe(false); // in the text itself, the browser places the cursor
    await table.vm.$nextTick();
    await table.vm.$nextTick();
    // A press on the line under the selection, or its button, leaves the cursor where it is.
    expect(press(table.find('.selection-label button').element).defaultPrevented).toBe(true);
    table.unmount();
  });

  it('gives the cursor to the first selected cell that can take it, when the start cell cannot', async () => {
    const { drag, cell, table } = await showThreeL3UseCases(true);
    await drag([0, 'Weight'], [2, 'Visibility']); // the weight is calculated
    const first = cell(0, 'Visibility').find('input').element; // the first selected cell that can take the cursor
    expect(document.activeElement).toBe(first);
    expect(press(cell(1, 'Weight').element).defaultPrevented).toBe(true); // keeps the cursor where it is
    expect(document.activeElement).toBe(first);
    cell(1, 'Visibility').find('input').element.setAttribute('disabled', ''); // as when it comes from the technique
    expect(press(cell(1, 'Visibility').find('input').element).defaultPrevented).toBe(true);
    await drag([0, 'Override'], [2, 'Override']); // a switch takes the cursor too: Space switches all of them
    expect(document.activeElement).toBe(cell(0, 'Override').find('input').element);
    table.unmount();
  });

  it('ends the selection when the cursor leaves it with the keyboard', async () => {
    const { drag, cell, selected, table } = await showThreeL3UseCases(true);
    await drag([0, 'Use Case Name'], [2, 'Use Case Name']);
    (cell(1, 'Use Case Name').find('textarea').element as HTMLElement).focus();
    await table.vm.$nextTick();
    expect(selected()).toBe(3);
    (cell(1, 'Description').find('textarea').element as HTMLElement).focus(); // Tab to the next cell
    await table.vm.$nextTick();
    expect(selected()).toBe(0);
    table.unmount();
  });

  it('says under the selection how many cells it has and that a change goes to all', async () => {
    const { drag, table } = await showThreeL3UseCases(true);
    await drag([0, 'Implementation'], [2, 'Effectiveness']);
    await table.vm.$nextTick();
    await table.vm.$nextTick();
    expect(table.find('.selection-label').text()).toMatch(
      /^6 cells selected · a change goes to all\s+Delete 3 use cases$/,
    );
    table.unmount();
  });

  it('keeps the selection for a click in it, so a choice in a search field goes to all of them', async () => {
    const { drag, cell, useCases, table } = await showThreeL3UseCases();
    await drag([0, 'ATT&CK Technique'], [2, 'ATT&CK Technique']);
    await cell(1, 'ATT&CK Technique').trigger('mousedown', { button: 0 });
    const picker = table
      .findAllComponents({ name: 'OptionPicker' })
      .filter((found) => found.props('noun') === 'technique')[1]!;
    picker.vm.$emit('update:modelValue', 'T1566');
    expect(useCases().map((useCase) => useCase.attackTechniqueId)).toEqual(['T1566', 'T1566', 'T1566']);
  });

  it('skips the cells that cannot be changed, such as a visibility that comes from the technique', async () => {
    const { drag, cell, useCases, magma } = await showThreeL3UseCases();
    magma.updateUseCase(useCases()[0]!.uid, { attackTechniqueId: 'T1566' }, domain);
    const fromTechnique = useCases()[0]!.visibility;
    for (const useCase of useCases().slice(1)) {
      magma.updateUseCase(useCase.uid, { visibilityFromAttackTechniqueOverride: true }, domain);
    }
    await drag([0, 'Visibility'], [2, 'Visibility']);
    await cell(2, 'Visibility').find('input').setValue('40');
    expect(useCases().map((useCase) => useCase.visibility)).toEqual([fromTechnique, '40', '40']);
  });

  it('makes a block with a click and a shift-click, and ends it with Esc', async () => {
    const { cell, selected, table } = await showThreeL3UseCases();
    await cell(0, 'Use Case Name').trigger('mousedown', { button: 0 });
    window.dispatchEvent(new MouseEvent('mouseup'));
    await cell(2, 'Description').trigger('mousedown', { button: 0, shiftKey: true });
    expect(selected()).toBe(6);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await table.vm.$nextTick();
    expect(selected()).toBe(0);
  });

  // Typing without leaving the field (setValue would also leave it: a change event).
  const typeIn = async (field: ReturnType<ReturnType<typeof mount>['find']>, text: string) => {
    (field.element as HTMLTextAreaElement).value = text;
    await field.trigger('input');
  };

  it('gives the selected IDs the typed base with letters, shown while typing, in sheet order and as one undo step', async () => {
    const { drag, cell, useCases, magma, table } = await showThreeL3UseCases(true);
    const original = useCases().map((useCase) => useCase.id);
    magma.renameUseCase(useCases()[2]!.uid, 'THR-1-A'); // not selected: its letter is taken
    await table.vm.$nextTick();
    const id = (row: number) => cell(row, 'ID').find('textarea');
    await drag([0, 'ID'], [1, 'ID']);
    await typeIn(id(0), 'THR-1');
    await table.vm.$nextTick();
    expect((id(0).element as HTMLTextAreaElement).value).toBe('THR-1'); // the typed text stays
    expect((id(1).element as HTMLTextAreaElement).value).toBe('THR-1-C'); // what it will become, in grey
    expect(id(1).classes()).toContain('id-preview');
    await table.vm.$nextTick();
    await table.vm.$nextTick();
    expect(table.find('.selection-label').text()).toMatch(/^2 IDs selected · Enter names them THR-1-B to THR-1-C\s/);
    await id(0).trigger('change'); // Enter, or leaving the cell
    expect(useCases().map((useCase) => useCase.id)).toEqual(['THR-1-B', 'THR-1-C', 'THR-1-A']);
    expect(magma.undoDescription).toBe('ID of 2 use cases');
    magma.undo();
    expect(useCases().map((useCase) => useCase.id)).toEqual([original[0], original[1], 'THR-1-A']);
    table.unmount();
  });

  it('puts the old IDs back with Esc', async () => {
    const { drag, cell, useCases, table } = await showThreeL3UseCases(true);
    const original = useCases().map((useCase) => useCase.id);
    const id = (row: number) => cell(row, 'ID').find('textarea').element as HTMLTextAreaElement;
    await drag([0, 'ID'], [2, 'ID']);
    await typeIn(cell(0, 'ID').find('textarea'), 'THR-1');
    await cell(0, 'ID').find('textarea').trigger('keydown', { key: 'Escape' });
    await table.vm.$nextTick();
    expect([id(0).value, id(1).value, id(2).value]).toEqual(original);
    expect(useCases().map((useCase) => useCase.id)).toEqual(original);
    table.unmount();
  });

  it('deletes only its own row with the ×, also when the row is part of a selection', async () => {
    const { drag, table, useCases } = await showThreeL3UseCases();
    await drag([0, 'Use Case Name'], [1, 'Description']);
    await table.findAll('tbody .remove-button')[1]!.trigger('click');
    expect(useCases()).toHaveLength(2);
    expect(Swal.fire).toHaveBeenLastCalledWith(
      expect.objectContaining({ titleText: expect.stringMatching(/^Deleted /) }),
    );
  });

  it('deletes the selected rows with the button under the selection, marked while the mouse is on it', async () => {
    const { drag, table, useCases, magma } = await showThreeL3UseCases(true);
    await drag([0, 'Use Case Name'], [1, 'Description']);
    await table.vm.$nextTick();
    await table.vm.$nextTick();
    const button = table.find('.selection-label button');
    expect(button.text()).toBe('Delete 2 use cases');
    await button.trigger('mouseenter');
    expect(table.findAll('tbody tr.delete-marked')).toHaveLength(2);
    await button.trigger('mousedown', { button: 0 }); // a press on the button does not end the selection
    await button.trigger('click');
    expect(useCases()).toHaveLength(1);
    expect(Swal.fire).toHaveBeenLastCalledWith(
      expect.objectContaining({ titleText: expect.stringMatching(/^Deleted 2 use cases: /) }),
    );
    magma.undo();
    expect(useCases()).toHaveLength(3);
    table.unmount();
  });

  it('marks the rows a delete button would delete while the mouse is on it: its own row, or all but IN and THR', async () => {
    const { table } = await showTable('L1'); // IN and THR on top, then a new use case
    const marked = () =>
      table.findAll('tbody tr').flatMap((row, index) => (row.classes('delete-marked') ? [index] : []));
    const remove = table.find('tbody .remove-button');
    await remove.trigger('mouseenter');
    expect(marked()).toEqual([2]);
    await remove.trigger('mouseleave');
    expect(marked()).toEqual([]);
    await table.find('thead th.remove-col').trigger('mouseenter');
    expect(marked()).toEqual([2]);
    await table.find('thead th.remove-col').trigger('mouseleave');
    expect(marked()).toEqual([]);
  });

  it('does not count IN and THR for the button under the selection: they cannot be deleted', async () => {
    const { cell, table } = await showTable('L1', true); // IN and THR on top, then a new use case
    const select = async (lastRow: number) => {
      await cell(0, 'Use Case Name').trigger('mousedown', { button: 0 });
      await cell(lastRow, 'Use Case Name').trigger('mouseenter', { buttons: 1 });
      window.dispatchEvent(new MouseEvent('mouseup'));
      await table.vm.$nextTick();
      await table.vm.$nextTick();
    };
    await select(2);
    expect(table.find('.selection-label button').text()).toBe('Delete 1 use case');
    await select(1);
    expect(table.find('.selection-label').exists()).toBe(true);
    expect(table.find('.selection-label button').exists()).toBe(false);
    table.unmount();
  });
});

// Pasting text copied from a spreadsheet into the cell with the cursor, as the browser hands it over.
const paste = (element: Element, text: string) => {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  element.dispatchEvent(event);
  return event;
};

describe('UseCaseTable: pasting from a spreadsheet', () => {
  it('pastes from the cell with the cursor, right and down, adding use cases for rows below the last', async () => {
    const { cell, selected, useCases, magma, table } = await showThreeL3UseCases(true);
    paste(cell(1, 'Use Case Name').find('textarea').element, 'A\tabout A\nB\tabout B\nC\tabout C\n');
    await table.vm.$nextTick();
    expect(useCases().map((useCase) => [useCase.name, useCase.description])).toEqual([
      ['', ''],
      ['A', 'about A'],
      ['B', 'about B'],
      ['C', 'about C'],
    ]);
    expect(selected()).toBe(6); // the pasted cells are selected
    expect(Swal.fire).toHaveBeenLastCalledWith(
      expect.objectContaining({ titleText: 'Pasted 3 rows into L3, 1 of them new.' }),
    );
    expect(magma.undoDescription).toBe('Paste 3 rows into L3');
    magma.undo();
    expect(useCases().map((useCase) => useCase.name)).toEqual(['', '', '']);
    table.unmount();
  });

  it('reads each value for its column, skips calculated columns, and lists the values left out', async () => {
    const { cell, useCases, table } = await showThreeL3UseCases(true);
    const row = (index: number) => {
      const { parentIds, dataSource, attackTechniqueId, visibilityFromAttackTechniqueOverride, visibility } =
        useCases()[index]!;
      const { implementation, effectiveness } = useCases()[index]!;
      return [parentIds, dataSource, attackTechniqueId, visibilityFromAttackTechniqueOverride, visibility]
        .concat([implementation, effectiveness])
        .map((value) => value ?? '-');
    };
    const before = row(1);
    paste(
      cell(0, 'Parent Use Case').find('.current').element,
      'THR-1\tProxy logs\tT1566\tyes\t40\t65%\t72,5\t99\n' + 'IN-1\tSign-in logs\tT9999\tmaybe\tabc\t\t50\n',
    );
    await table.vm.$nextTick();
    expect(row(0)).toEqual([['THR-1'], 'Proxy logs', 'T1566', true, '40', '65', '72.5']);
    expect(row(1)).toEqual([['IN-1'], 'Sign-in logs', before[2], before[3], before[4], '', '50']); // 3 left out
    expect(useCases()[0]!.weight).not.toBe('99'); // calculated: left out
    expect(Swal.fire).toHaveBeenLastCalledWith(
      expect.objectContaining({
        text: expect.stringMatching(/^3 values left out: .*"T9999" is not an ATT&CK technique/),
      }),
    );
    table.unmount();
  });

  it('leaves out a first row with the column titles', async () => {
    const { cell, useCases, table } = await showThreeL3UseCases(true);
    paste(cell(0, 'Use Case Name').find('textarea').element, 'Use Case Name\tDescription\nA\tabout A\n');
    expect(useCases().map((useCase) => useCase.name)).toEqual(['A', '', '']);
    table.unmount();
  });

  it('pastes IDs, and leaves out one that is already taken', async () => {
    const { cell, useCases, table } = await showThreeL3UseCases(true);
    const before = useCases().map((useCase) => useCase.id);
    paste(cell(0, 'ID').find('textarea').element, 'NEW-1\nNEW-1\n');
    expect(useCases().map((useCase) => useCase.id)).toEqual(['NEW-1', before[1], before[2]]);
    table.unmount();
  });

  it('pastes one value into a selection of search fields, and leaves one value in a text field to the browser', async () => {
    const { drag, cell, useCases, table } = await showThreeL3UseCases(true);
    await drag([0, 'ATT&CK Technique'], [2, 'ATT&CK Technique']);
    expect(paste(cell(0, 'ATT&CK Technique').find('.current').element, 'T1566\n').defaultPrevented).toBe(true);
    expect(useCases().map((useCase) => useCase.attackTechniqueId)).toEqual(['T1566', 'T1566', 'T1566']);
    expect(paste(cell(0, 'Use Case Name').find('textarea').element, 'one value').defaultPrevented).toBe(false);
    table.unmount();
  });
});

describe('UseCaseTable: moving between cells with the keyboard', () => {
  // A key pressed in a field, as the browser sends it (it bubbles to the sheet); whether the sheet took it.
  const press = (element: Element, key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  };
  const field = (cell: ReturnType<Awaited<ReturnType<typeof showTable>>['cell']>) =>
    cell.find('input, textarea, .current').element as HTMLElement;

  it('moves with the arrows to the next cell that can take the cursor, with its text selected', async () => {
    const { cell, magma, useCases, table } = await showThreeL3UseCases(true);
    magma.updateUseCase(useCases()[1]!.uid, { name: 'Beta', attackTechniqueId: 'T1566' }, domain);
    await table.vm.$nextTick();
    press(field(cell(0, 'Use Case Name')), 'ArrowDown');
    const name = field(cell(1, 'Use Case Name')) as HTMLTextAreaElement;
    expect(document.activeElement).toBe(name);
    expect([name.selectionStart, name.selectionEnd]).toEqual([0, 4]);
    press(field(cell(1, 'Implementation')), 'ArrowLeft'); // the visibility comes from the technique: locked
    expect(document.activeElement).toBe(cell(1, 'Override').find('input').element);
    table.unmount();
  });

  it('keeps Left and Right in the text until the cursor is at its start or end', async () => {
    const { cell, magma, useCases, table } = await showThreeL3UseCases(true);
    magma.updateUseCase(useCases()[0]!.uid, { name: 'Alpha' }, domain);
    await table.vm.$nextTick();
    const name = field(cell(0, 'Use Case Name')) as HTMLTextAreaElement;
    name.focus();
    name.setSelectionRange(2, 2);
    expect(press(name, 'ArrowLeft')).toBe(false);
    expect(document.activeElement).toBe(name);
    name.setSelectionRange(0, 0);
    expect(press(name, 'ArrowLeft')).toBe(true);
    expect(document.activeElement).toBe(field(cell(0, 'ID')));
    table.unmount();
  });

  it('moves down with Enter and up with Shift+Enter, and on to the next row with Tab', async () => {
    const { cell, table } = await showThreeL3UseCases(true);
    press(field(cell(0, 'Use Case Name')), 'Enter');
    expect(document.activeElement).toBe(field(cell(1, 'Use Case Name')));
    press(field(cell(1, 'Use Case Name')), 'Enter', { shiftKey: true });
    expect(document.activeElement).toBe(field(cell(0, 'Use Case Name')));
    press(field(cell(0, 'Effectiveness')), 'Tab'); // the last cell of the row that can take the cursor
    expect(document.activeElement).toBe(field(cell(1, 'ID')));
    expect(press(field(cell(1, 'Description')), 'Enter')).toBe(false); // a new line
    table.unmount();
  });

  it('grows and shrinks a selection with Shift+arrows from the cell with the cursor, which keeps the cursor', async () => {
    const { cell, selected, table } = await showThreeL3UseCases(true);
    const name = field(cell(0, 'Use Case Name'));
    name.focus(); // its (empty) text counts as all selected, as on arrival
    press(name, 'ArrowDown', { shiftKey: true });
    press(name, 'ArrowDown', { shiftKey: true });
    press(name, 'ArrowRight', { shiftKey: true });
    await table.vm.$nextTick();
    expect(selected()).toBe(6);
    expect(document.activeElement).toBe(name);
    press(name, 'ArrowUp', { shiftKey: true });
    await table.vm.$nextTick();
    expect(selected()).toBe(4);
    table.unmount();
  });

  it('grows a selection made with the mouse from its far corner, and a plain arrow ends it', async () => {
    const { drag, cell, selected, table } = await showThreeL3UseCases(true);
    await drag([0, 'Use Case Name'], [1, 'Use Case Name']);
    press(field(cell(0, 'Use Case Name')), 'ArrowRight', { shiftKey: true });
    await table.vm.$nextTick();
    expect(selected()).toBe(4);
    press(field(cell(0, 'Use Case Name')), 'ArrowDown');
    await table.vm.$nextTick();
    expect(selected()).toBe(0);
    expect(document.activeElement).toBe(field(cell(1, 'Use Case Name')));
    table.unmount();
  });

  it('leaves Shift+arrows inside a text to select characters', async () => {
    const { cell, magma, useCases, selected, table } = await showThreeL3UseCases(true);
    magma.updateUseCase(useCases()[0]!.uid, { name: 'Alpha' }, domain);
    await table.vm.$nextTick();
    const name = field(cell(0, 'Use Case Name')) as HTMLTextAreaElement;
    name.focus();
    name.setSelectionRange(2, 2);
    expect(press(name, 'ArrowRight', { shiftKey: true })).toBe(false);
    expect(selected()).toBe(0);
    table.unmount();
  });

  it('moves from a search field with the arrows, instead of opening its list', async () => {
    const { cell, table } = await showThreeL3UseCases(true);
    press(field(cell(0, 'ATT&CK Technique')), 'ArrowDown');
    await table.vm.$nextTick();
    expect(document.activeElement).toBe(field(cell(1, 'ATT&CK Technique')));
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    table.unmount();
  });

  it('leaves the delete buttons out of Tab, so the keyboard cannot delete by accident', async () => {
    const { table, magma, useCases } = await showThreeL3UseCases(true);
    magma.updateUseCase(useCases()[0]!.uid, { attackTechniqueId: 'T1566' }, domain);
    await table.vm.$nextTick();
    expect(table.findAll('tbody .remove-button').every((button) => button.attributes('tabindex') === '-1')).toBe(true);
    expect(table.find('.option-picker .clear').attributes('tabindex')).toBe('-1');
    table.unmount();
  });

  it('after a delete, puts the cursor in the same column of the row that takes its place, or the row above', async () => {
    const { cell, useCases, table } = await showThreeL3UseCases(true);
    const [, second, third] = useCases();
    field(cell(0, 'Description')).focus(); // the column worked in
    await table.findAll('tbody .remove-button')[0]!.trigger('click');
    await table.vm.$nextTick();
    expect(document.activeElement).toBe(field(cell(0, 'Description'))); // the second use case, now on top
    expect(useCases()[0]).toBe(second);
    await table.findAll('tbody .remove-button')[1]!.trigger('click'); // the last row
    await table.vm.$nextTick();
    expect(document.activeElement).toBe(field(cell(0, 'Description')));
    expect(useCases()).toEqual([second]);
    expect(third).toBeDefined();
    table.unmount();
  });
});

// Copying (or cutting) with ⌘C or Ctrl+C (⌘X, Ctrl+X), as the browser hands it to the sheet; what the clipboard gets.
const copy = (element: Element, type: 'copy' | 'cut' = 'copy') => {
  const setData = vi.fn();
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { setData } });
  element.dispatchEvent(event);
  return { copied: event.defaultPrevented ? (setData.mock.lastCall?.[1] as string) : null };
};

describe('UseCaseTable: copying to a spreadsheet', () => {
  it('copies a selection as a block a spreadsheet can paste: IDs for parents and techniques, yes or no', async () => {
    const { drag, cell, magma, useCases, table } = await showThreeL3UseCases(true);
    const [first, second] = useCases();
    magma.updateUseCase(
      first!.uid,
      { name: 'Beaconing', description: 'Two\nlines', attackTechniqueId: 'T1566' },
      domain,
    );
    magma.updateUseCase(second!.uid, { name: 'Uploads', implementation: '72.5' }, domain);
    await table.vm.$nextTick();
    await drag([0, 'Use Case Name'], [1, 'Override']);
    const { copied } = copy(cell(0, 'Use Case Name').find('textarea').element);
    expect(copied).toBe('Beaconing\t"Two\nlines"\t\t\tT1566\tno\r\n' + 'Uploads\t\t\t\t\tno\r\n');
    await table.vm.$nextTick();
    await table.vm.$nextTick();
    expect(table.find('.selection-label').text()).toMatch(/^12 cells copied/);
    table.unmount();
  });

  it('copies the cell with the cursor when nothing is selected in it, and leaves selected text to the browser', async () => {
    const { cell, magma, useCases, table } = await showThreeL3UseCases(true);
    magma.updateUseCase(useCases()[0]!.uid, { name: 'Beaconing', attackTechniqueId: 'T1566' }, domain);
    await table.vm.$nextTick();
    expect(copy(cell(0, 'ATT&CK Technique').find('.current').element).copied).toBe('T1566\r\n');
    const name = cell(0, 'Use Case Name').find('textarea').element as HTMLTextAreaElement;
    name.focus();
    name.setSelectionRange(3, 3);
    expect(copy(name).copied).toBe('Beaconing\r\n');
    name.setSelectionRange(0, 4);
    expect(copy(name).copied).toBeNull(); // the browser copies "Beac"
    table.unmount();
  });

  it('cuts a selection: copies it and empties the cells that can be empty, as one undo step', async () => {
    const { drag, cell, magma, useCases, table } = await showThreeL3UseCases(true);
    const [first, second] = useCases();
    magma.updateUseCase(first!.uid, { name: 'Beaconing', attackTechniqueId: 'T1566' }, domain);
    magma.updateUseCase(second!.uid, { name: 'Uploads', dataSource: 'Proxy logs' }, domain);
    await table.vm.$nextTick();
    const ids = useCases().map((useCase) => useCase.id);
    await drag([0, 'ID'], [1, 'ATT&CK Technique']);
    const { copied } = copy(cell(0, 'ID').find('textarea').element, 'cut');
    expect(copied).toBe(`${ids[0]}\tBeaconing\t\t\t\tT1566\r\n${ids[1]}\tUploads\t\t\tProxy logs\t\r\n`);
    const values = () =>
      useCases().map((useCase) => [useCase.id, useCase.name, useCase.dataSource, useCase.attackTechniqueId]);
    expect(values().slice(0, 2)).toEqual([
      [ids[0], '', '', 'none'], // an ID cannot be empty: it stays
      [ids[1], '', '', 'none'],
    ]);
    await table.vm.$nextTick();
    await table.vm.$nextTick();
    expect(table.find('.selection-label').text()).toMatch(/^12 cells cut/);
    expect(magma.undoDescription).toBe('Cut 12 cells');
    magma.undo();
    expect(values().slice(0, 2)).toEqual([
      [ids[0], 'Beaconing', undefined, 'T1566'],
      [ids[1], 'Uploads', 'Proxy logs', 'none'], // a new use case starts without a technique
    ]);
    table.unmount();
  });

  it('cuts the whole cell with the cursor when nothing is selected in it', async () => {
    const { cell, magma, useCases, table } = await showThreeL3UseCases(true);
    magma.updateUseCase(useCases()[0]!.uid, { attackTechniqueId: 'T1566' }, domain);
    await table.vm.$nextTick();
    expect(copy(cell(0, 'ATT&CK Technique').find('.current').element, 'cut').copied).toBe('T1566\r\n');
    expect(useCases()[0]!.attackTechniqueId).toBe('none');
    table.unmount();
  });
});
