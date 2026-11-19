import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HeatmapLegend from '../HeatmapLegend.vue';

describe('HeatmapLegend', () => {
  it('shows n/a, 0 and the four steps, as the DeTT&CT legend; the hint on 0 also covers techniques without use cases', () => {
    const legend = mount(HeatmapLegend);
    const swatches = legend.findAll('.swatch');
    expect(swatches.map((swatch) => swatch.text())).toEqual(['n/a', '0', '25', '50', '75', '100']);
    expect(swatches[1]!.attributes('aria-description')).toBe(
      'Score 0%, or no use cases. A technique with use cases has a thick border.',
    );
  });
});
