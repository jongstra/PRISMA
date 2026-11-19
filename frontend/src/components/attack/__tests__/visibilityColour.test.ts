import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { VISIBILITY_STEPS, visibilityColour } from '../visibilityColour';
import VisibilityLegend from '../VisibilityLegend.vue';

const purple = (backgroundColor: string) => ({ backgroundColor, color: 'black' });

describe('visibilityColour', () => {
  it('gives a visibility the purple of its step, with black text: the darkest step stays light', () => {
    expect(visibilityColour(0)).toEqual(purple(''));
    expect(visibilityColour(0.01)).toEqual(purple('#f1cee5'));
    expect(visibilityColour(0.25)).toEqual(purple('#f1cee5'));
    expect(visibilityColour(0.26)).toEqual(purple('#e5a6cf'));
    expect(visibilityColour(0.5)).toEqual(purple('#e5a6cf'));
    expect(visibilityColour(0.75)).toEqual(purple('#d97db9'));
    expect(visibilityColour(0.76)).toEqual(purple('#cf5da7'));
    expect(visibilityColour(1)).toEqual(purple('#cf5da7'));
  });

  it('has the same four steps as the MaGMa heatmap: up to 25, 50, 75 and 100%', () => {
    expect(VISIBILITY_STEPS.map((step) => step.upTo)).toEqual([25, 50, 75, 100]);
  });
});

describe('VisibilityLegend', () => {
  it('shows n/a and a scale: 0 in the white part, then the four purple steps, each with its own hint', () => {
    const legend = mount(VisibilityLegend);
    expect(legend.findAll('.tick').map((tick) => tick.text())).toEqual(['n/a', '0', '25', '50', '75', '100']);
    const parts = legend.findAll('.scale-part');
    expect(parts.map((part) => (part.element as HTMLElement).style.backgroundColor)).toEqual([
      '',
      'rgb(241, 206, 229)',
      'rgb(229, 166, 207)',
      'rgb(217, 125, 185)',
      'rgb(207, 93, 167)',
    ]);
    expect(legend.find('.scale-na').attributes('aria-description')).toBe(
      'Not detectable from data: ATT&CK lists no data components for this technique.',
    );
    expect(parts.map((part) => part.attributes('aria-description'))).toEqual([
      'No visibility: its data sources are not in your DeTT&CT file, or score 0.',
      'Visibility up to 25%',
      'Visibility 25 to 50%',
      'Visibility 50 to 75%',
      'Visibility 75 to 100%',
    ]);
  });
});
