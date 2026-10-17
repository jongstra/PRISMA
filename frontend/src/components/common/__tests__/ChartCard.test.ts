import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ChartCard from '../ChartCard.vue';

describe('ChartCard', () => {
  it('explains its title with the pink hint, and shows the help cursor there', () => {
    const card = mount(ChartCard, {
      props: { hint: 'How many techniques ATT&CK lists under each tactic.' },
      slots: { title: 'Techniques per Tactic' },
    });
    const title = card.find('.title');
    expect(title.attributes('aria-description')).toBe('How many techniques ATT&CK lists under each tactic.');
    expect(title.classes()).toContain('has-hint');
  });

  it('has no hint and a normal cursor when it gets no hint', () => {
    const title = mount(ChartCard, { slots: { title: 'Counts' } }).find('.title');
    expect(title.attributes('aria-description') ?? '').toBe('');
    expect(title.classes()).not.toContain('has-hint');
  });
});
