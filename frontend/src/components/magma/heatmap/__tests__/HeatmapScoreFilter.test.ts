import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { magmaStore } from '@/stores/magma';
import HeatmapScoreFilter from '../HeatmapScoreFilter.vue';

// The score filter, opened: its 'Weight' item at the top, then one item per score.
async function openScoreFilter() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const filter = mount(HeatmapScoreFilter, { global: { plugins: [pinia] } });
  await filter.find('button.header').trigger('click');
  const weight = filter.find<HTMLInputElement>('li.all input');
  const score = (label: string) =>
    filter
      .findAll('li:not(.all)')
      .find((item) => item.text() === label)!
      .find<HTMLInputElement>('input');
  const scores = () => {
    const magma = magmaStore();
    return [magma.heatmapVisibility, magma.heatmapImplementation, magma.heatmapEffectiveness];
  };
  return { filter, weight, score, scores, summary: () => filter.find('.summary').text() };
}

describe('HeatmapScoreFilter', () => {
  it('has a Weight item at the top, ticked while all three scores are, as the weight is their product', async () => {
    const { filter, weight } = await openScoreFilter();
    expect(filter.find('li.all').text()).toBe('Weight');
    expect(weight.element.checked).toBe(true);
    expect(weight.element.indeterminate).toBe(false);
  });

  it('shows a dash in Weight while only some scores are ticked', async () => {
    const { weight, score, scores, summary } = await openScoreFilter();
    await score('Visibility').setValue(false);
    expect(scores()).toEqual([false, true, true]);
    expect(summary()).toBe('I × E');
    expect(weight.element.checked).toBe(false);
    expect(weight.element.indeterminate).toBe(true);
  });

  it('ticks all three scores with Weight, and unticks them all, as All does for the platforms', async () => {
    const { weight, score, scores, summary } = await openScoreFilter();
    await score('Visibility').setValue(false);
    await score('Effectiveness').setValue(false);
    expect(summary()).toBe('Implementation');
    await weight.setValue(true);
    expect(scores()).toEqual([true, true, true]);
    expect(summary()).toBe('Weight');
    await weight.setValue(false);
    expect(scores()).toEqual([false, false, false]);
    expect(summary()).toBe('No score');
  });
});
