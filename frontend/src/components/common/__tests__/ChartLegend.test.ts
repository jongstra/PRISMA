import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ChartLegend from '../ChartLegend.vue';

describe('ChartLegend', () => {
  it('shows a swatch in the bar colour before each label, and an optional explanation', () => {
    const legend = mount(ChartLegend, {
      props: {
        items: [
          { label: 'Techniques', color: 'SteelBlue' },
          { label: 'Sub-techniques', color: '#89AFCF' },
        ],
      },
      slots: { default: 'How the bars are split.' },
    });
    expect(legend.findAll('.legend-item').map((item) => item.text())).toEqual(['Techniques', 'Sub-techniques']);
    expect(legend.findAll('.swatch').map((swatch) => (swatch.element as HTMLElement).style.backgroundColor)).toEqual([
      'steelblue',
      'rgb(137, 175, 207)',
    ]);
    expect(legend.find('.explanation').text()).toBe('How the bars are split.');
  });

  it('leaves the explanation out when there is none', () => {
    const legend = mount(ChartLegend, { props: { items: [{ label: 'Groups', color: 'FireBrick' }] } });
    expect(legend.find('.explanation').exists()).toBe(false);
  });
});
