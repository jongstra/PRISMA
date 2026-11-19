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
  it('shows n/a, 0% and the four steps, labelled as on the MaGMa heatmap, with the range in the hint', () => {
    const legend = mount(VisibilityLegend);
    const swatches = legend.findAll('.legend-button');
    expect(swatches.map((swatch) => swatch.text())).toEqual(['n/a', '0', '25', '50', '75', '100']);
    expect(swatches[3]!.attributes('aria-description')).toBe('Visibility above 25, up to 50%');
    expect((swatches[5]!.element as HTMLElement).style.backgroundColor).toBe('rgb(207, 93, 167)');
  });
});
