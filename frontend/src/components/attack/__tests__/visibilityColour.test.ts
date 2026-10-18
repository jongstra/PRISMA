import { describe, it, expect } from 'vitest';
import { visibilityColour } from '../visibilityColour';

describe('visibilityColour', () => {
  it('gives the purple of the matrix and the legend for each visibility band, with white text from 50% up', () => {
    expect(visibilityColour(0)).toEqual({ backgroundColor: '', color: 'black' });
    expect(visibilityColour(0.01)).toEqual({ backgroundColor: '', color: 'black' });
    expect(visibilityColour(0.2)).toEqual({ backgroundColor: '#E1BEE7', color: 'black' });
    expect(visibilityColour(0.5)).toEqual({ backgroundColor: '#CE93D8', color: 'black' });
    expect(visibilityColour(0.75)).toEqual({ backgroundColor: '#AB47BC', color: 'white' }); // white reads better here (4.9:1 against 4.3:1)
    expect(visibilityColour(0.99)).toEqual({ backgroundColor: '#7B1FA2', color: 'white' });
    expect(visibilityColour(1)).toEqual({ backgroundColor: '#4A148C', color: 'white' });
  });
});
