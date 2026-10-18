import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TechniqueTag from '../TechniqueTag.vue';

describe('TechniqueTag', () => {
  it('shows a group or data component by name, grey when not selected', () => {
    const tag = mount(TechniqueTag, { props: { name: 'APT28', kind: 'group' } });
    expect(tag.text()).toBe('APT28');
    expect(tag.classes()).toEqual(expect.arrayContaining(['tt-tag', 'group-box']));
    expect(tag.classes()).not.toContain('selected');
  });

  it('marks a selected one with a check mark', () => {
    const tag = mount(TechniqueTag, { props: { name: 'Network Traffic Flow', kind: 'component', selected: true } });
    expect(tag.text()).toBe('✓ Network Traffic Flow');
    expect(tag.classes()).toEqual(expect.arrayContaining(['component-box', 'selected']));
  });

  it('marks a data component in use with a dot', () => {
    const tag = mount(TechniqueTag, { props: { name: 'Process Creation', kind: 'component', inUse: true } });
    expect(tag.find('.tt-dot').exists()).toBe(true);
    expect(tag.attributes('aria-description')).toBe('In use: in the loaded DeTT&CT file');
  });
});
