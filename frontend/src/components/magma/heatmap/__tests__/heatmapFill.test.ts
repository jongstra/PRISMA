import { describe, it, expect } from 'vitest';
import { heatmapFill } from '../heatmapFill';

describe('heatmapFill', () => {
  it('lays the green of a score over the base colour of the button, so 0% looks like the base colour', () => {
    expect(heatmapFill(25)).toEqual({
      backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.25), rgba(0, 255, 0, 0.25))',
    });
    expect(heatmapFill(0)).toEqual({ backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0), rgba(0, 255, 0, 0))' });
    expect(heatmapFill(100)).toEqual({ backgroundImage: 'linear-gradient(rgba(0, 255, 0, 1), rgba(0, 255, 0, 1))' });
  });
});
