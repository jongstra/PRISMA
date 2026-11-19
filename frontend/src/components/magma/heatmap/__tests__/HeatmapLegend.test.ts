import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HeatmapLegend from '../HeatmapLegend.vue';

describe('HeatmapLegend', () => {
  it('shows n/a and a scale as the DeTT&CT legend, with hints in the words of the chosen score', () => {
    const legend = mount(HeatmapLegend, { props: { scoreName: 'weight' } });
    expect(legend.findAll('.tick').map((tick) => tick.text())).toEqual(['n/a', '0', '25', '50', '75', '100']);
    expect(legend.findAll('.scale-part').map((part) => part.attributes('aria-description'))).toEqual([
      'Weight 0%, or no use cases. A thick border means the technique has use cases.',
      'Weight up to 25%',
      'Weight 25 to 50%',
      'Weight 50 to 75%',
      'Weight 75 to 100%',
    ]);
  });
});
