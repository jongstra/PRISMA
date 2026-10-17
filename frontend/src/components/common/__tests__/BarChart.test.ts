import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BarChart from '../BarChart.vue';

const rows = [
  {
    name: 'Windows',
    segments: [
      { value: 30, color: 'SteelBlue' },
      { value: 10, color: '#89AFCF' },
    ],
    label: 40,
  },
  {
    name: 'Linux',
    segments: [
      { value: 20, color: 'SteelBlue' },
      { value: 0, color: '#89AFCF' },
    ],
    label: 20,
  },
];

describe('BarChart', () => {
  it('draws one row per item, with one bar part per segment, scaled to the maximum', () => {
    const chart = mount(BarChart, { props: { rows, max: 40 }, slots: { title: 'Platforms' } });
    expect(chart.find('.title').text()).toBe('Platforms');
    const items = chart.findAll('.item-row');
    expect(items.map((item) => item.find('.item-name').text())).toEqual(['Windows', 'Linux']);
    const bars = items[0].findAll('.track > .bar').map((bar) => (bar.element as HTMLElement).style);
    expect(bars.map((style) => style.width)).toEqual(['75%', '25%']);
    expect(bars.map((style) => style.backgroundColor)).toEqual(['steelblue', 'rgb(137, 175, 207)']);
  });

  it('shows the value at the end of the name line', () => {
    const chart = mount(BarChart, { props: { rows, max: 40 } });
    expect(chart.findAll('.item-row > .item-value').map((value) => value.text())).toEqual(['40', '20']);
  });

  it('puts the legend and the footnote together below the rows, at the bottom of the card', () => {
    const chart = mount(BarChart, {
      props: { rows, max: 40 },
      slots: { legend: '<div class="legend">Key</div>', footnote: '<div class="note">Note</div>' },
    });
    const foot = chart.find('.chart-foot');
    expect(foot.findAll('.chart-foot > *').map((part) => part.text())).toEqual(['Key', 'Note']);
    expect(chart.findAll('.chart-card > *').at(-1)?.classes()).toContain('chart-foot'); // after the rows
  });

  it('explains a row with the pink hint when it has one', () => {
    const chart = mount(BarChart, {
      props: { rows: [{ ...rows[0]!, hint: '30 techniques + 10 sub-techniques' }, rows[1]!], max: 40 },
    });
    const items = chart.findAll('.item-row');
    expect(items[0]!.attributes('aria-description')).toBe('30 techniques + 10 sub-techniques');
    expect(items[1]!.attributes('aria-description') ?? '').toBe(''); // no hint text, so nothing shows
  });

  it('says why it is empty when it has no rows', () => {
    const empty = mount(BarChart, { props: { rows: [], max: 0, empty: 'No data sources yet.' } });
    expect(empty.find('.empty').text()).toBe('No data sources yet.');
    const filled = mount(BarChart, { props: { rows, max: 40, empty: 'No data sources yet.' } });
    expect(filled.find('.empty').exists()).toBe(false);
  });
});
