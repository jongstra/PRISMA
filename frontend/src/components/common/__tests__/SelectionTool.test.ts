import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { notifyUndoable } from '../notify';
import { createPinia, setActivePinia } from 'pinia';
import fs from 'node:fs';
import { tacticsStore } from '@/stores/tactics';
import SelectionTool from '../SelectionTool.vue';

const catalog = JSON.parse(fs.readFileSync('public/tactics_and_techniques_by_domain.json', 'utf8'));

vi.mock('../notify', () => ({ notifyUndoable: vi.fn() }));

// The groups tool of the DeTT&CT page, with the enterprise catalog.
function showGroupsTool() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = tacticsStore();
  store.enterprise = structuredClone(catalog.enterprise);
  const tool = mount(SelectionTool, {
    attachTo: document.body,
    global: { plugins: [pinia] },
    props: {
      label: 'Groups',
      list: 'groups',
      selectedField: 'selected',
      onlyShowField: 'only_show_selected_groups',
      noun: 'group',
      toggleTitle: 'Only show techniques used by selected groups.',
      color: 'red',
    },
  });
  return { tool, groups: store.enterprise!.groups };
}

describe('SelectionTool', () => {
  it('shows a label and only the search field while nothing is selected, as the technique search', () => {
    const { tool } = showGroupsTool();
    expect(tool.find('.control-label').text()).toBe('Groups');
    const field = tool.find('input.search-box');
    expect(field.classes()).toContain('search-field'); // the shared look of the search fields (main.css)
    expect(field.attributes('placeholder')).toBe('Search groups...');
    expect(tool.find('.toggle-label').exists()).toBe(false);
    expect(tool.find('.clear-icon').exists()).toBe(false);
    tool.unmount();
  });

  it('moves the search field next to the label once something is selected, with the switch and a clear icon', async () => {
    const { tool, groups } = showGroupsTool();
    groups[0]!.selected = true;
    await nextTick();
    expect(tool.classes()).toContain('has-selection');
    expect(tool.find('input.search-box').attributes('placeholder')).toBe('Search...');
    expect(tool.find('input.search-box').classes()).toContain('compact'); // thinner, so two rows of items fit below
    expect(tool.find('.toggle-label').attributes('aria-description')).toBe(
      'Only show techniques used by selected groups.',
    );
    expect(tool.find('.clear-icon').attributes('aria-label')).toBe('Clear all groups');
    expect(tool.findAll('.buttons-wrapper button').map((chip) => chip.text())).toEqual([groups[0]!.name]);
    expect(tool.find('[title]').exists()).toBe(false); // hints are pink hints (v-hint), not the slow browser tooltip
    tool.unmount();
  });

  it('clears all selections at once, and offers to undo it in the message', async () => {
    const { tool, groups } = showGroupsTool();
    groups[0]!.selected = true;
    groups[1]!.selected = true;
    await nextTick();
    await tool.find('.clear-icon').trigger('click');
    expect(groups.filter((group) => group.selected)).toEqual([]);
    expect(notifyUndoable).toHaveBeenLastCalledWith('Cleared 2 groups.', undefined, expect.any(Function));
    vi.mocked(notifyUndoable).mock.lastCall![2]();
    expect(groups.filter((group) => group.selected).map((group) => group.name)).toEqual([
      groups[0]!.name,
      groups[1]!.name,
    ]);
    tool.unmount();
  });

  it('shows all groups that are not selected yet when the empty search field is clicked, and keeps the list open while choosing', async () => {
    const { tool, groups } = showGroupsTool();
    const suggestions = () => tool.findAll('.suggestion-item').map((item) => item.text());
    expect(suggestions()).toEqual([]);

    await tool.find('.search-box').trigger('focus');
    expect(suggestions()).toHaveLength(groups.length);

    await tool.findAll('.suggestion-item')[0]!.trigger('click');
    expect(groups[0]!.selected).toBe(true);
    expect(suggestions()).toHaveLength(groups.length - 1);

    await tool.find('.search-box').setValue('APT2');
    expect(suggestions().every((name) => name.toLowerCase().includes('apt2'))).toBe(true);

    await tool.find('.search-box').trigger('keydown', { key: 'Escape' });
    expect(suggestions()).toEqual([]);
    tool.unmount();
  });
});
