import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Slider from '@vueform/slider';
import { tacticsStore } from '@/stores/tactics';
import TechniqueVisibilityPercentageFilter from '../TechniqueVisibilityPercentageFilter.vue';
import TechniqueTotalOccurrenceFilterBinned from '../TechniqueTotalOccurrenceFilterBinned.vue';

// The filters are kept in the store while another page is open; coming back, the sliders show them again.
describe('the slider filters of the DeTT&CT page', () => {
  it('start at the visibility range that is in the store', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    Object.assign(tacticsStore(), { minVisibilityRatio: 0.2, maxVisibilityRatio: 0.8 });
    const filter = mount(TechniqueVisibilityPercentageFilter, { global: { plugins: [pinia] } });
    expect(filter.findComponent(Slider).props('modelValue')).toEqual([20, 80]);
  });

  it('start at the minimum total occurrence that is in the store', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    tacticsStore().minTotalOccurrencesBinned = 2;
    const filter = mount(TechniqueTotalOccurrenceFilterBinned, { global: { plugins: [pinia] } });
    expect(filter.findComponent(Slider).props('modelValue')).toBe(2);
  });
});
