import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import fs from 'node:fs';
import { tacticsStore } from '@/stores/tactics';
import SelectionTool from '../SelectionTool.vue';

const catalog = JSON.parse(fs.readFileSync('public/tactics_and_techniques_by_domain.json', 'utf8'));

describe('SelectionTool', () => {
  it('explains its switch with the pink hint (v-hint), not the slow browser tooltip', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    tacticsStore().enterprise = structuredClone(catalog.enterprise);
    const tool = mount(SelectionTool, {
      global: { plugins: [pinia] },
      props: {
        list: 'groups',
        selectedField: 'selected',
        onlyShowField: 'only_show_selected_groups',
        noun: 'group',
        toggleTitle: 'Only show techniques used by selected groups.',
        color: 'red',
      },
    });
    const toggle = tool.find('.toggle-label');
    expect(toggle.attributes('aria-description')).toBe('Only show techniques used by selected groups.');
    expect(tool.find('[title]').exists()).toBe(false);
  });

  it('shows all groups that are not selected yet when the empty search field is clicked, and keeps the list open while choosing', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = tacticsStore();
    store.enterprise = structuredClone(catalog.enterprise);
    const tool = mount(SelectionTool, {
      attachTo: document.body,
      global: { plugins: [pinia] },
      props: {
        list: 'groups',
        selectedField: 'selected',
        onlyShowField: 'only_show_selected_groups',
        noun: 'group',
        toggleTitle: 'Only show techniques used by selected groups.',
        color: 'red',
      },
    });
    const groups = store.enterprise!.groups;
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
