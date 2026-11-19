import { describe, it, expect } from 'vitest';
import { heatmapFill, HEATMAP_STEPS } from '../heatmapFill';

const fill = (colour: string) => ({ backgroundImage: `linear-gradient(${colour}, ${colour})` });

describe('heatmapFill', () => {
  it('gives a score the green of its step, laid over the base colour of the button', () => {
    expect(heatmapFill(10)).toEqual(fill('#d6eec8'));
    expect(heatmapFill(25)).toEqual(fill('#d6eec8'));
    expect(heatmapFill(25.5)).toEqual(fill('#b5e19a'));
    expect(heatmapFill(50)).toEqual(fill('#b5e19a'));
    expect(heatmapFill(75)).toEqual(fill('#93d36c'));
    expect(heatmapFill(76)).toEqual(fill('#78c847'));
    expect(heatmapFill(100)).toEqual(fill('#78c847'));
  });

  it('leaves a score of 0% in the base colour, as a technique without use cases', () => {
    expect(heatmapFill(0)).toEqual({});
  });

  it('names the steps for the legend: up to 25, 50, 75 and 100%', () => {
    expect(HEATMAP_STEPS.map((step) => step.upTo)).toEqual([25, 50, 75, 100]);
  });
});
