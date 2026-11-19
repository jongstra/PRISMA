import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { hoverTag, useEndTagHover } from '../useTagHover';

const domain = () => ({
  groups: [{ name: 'APT1' }, { name: 'APT2' }] as { name: string; hovered?: boolean }[],
  data_components: [{ name: 'Process Creation' }] as { name: string; hovered?: boolean }[],
});

describe('useTagHover', () => {
  it('marks a hovered group or data component, so the matrix can ring its techniques', () => {
    const data = domain();
    hoverTag(data.groups, 'APT2');
    expect(data.groups.map((group) => !!group.hovered)).toEqual([false, true]);
  });

  it('ends the marks when the mouse moves off the tags (one listener for the whole page)', () => {
    const data = domain();
    const page = mount(defineComponent({ setup: () => (useEndTagHover(() => data), () => h('div')) }), {
      attachTo: document.body,
    });
    const tag = document.createElement('span');
    tag.className = 'tt-tag group-box';
    document.body.append(tag);
    hoverTag(data.groups, 'APT1');
    hoverTag(data.data_components, 'Process Creation');
    tag.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(data.groups[0]!.hovered).toBe(true); // still on a group tag
    expect(data.data_components[0]!.hovered).toBeUndefined();
    document.body.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(data.groups[0]!.hovered).toBeUndefined();
    page.unmount();
    tag.remove();
  });
});
