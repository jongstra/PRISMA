import { describe, it, expect } from 'vitest';
import { typedPercentage } from '../percentageInput';

describe('typedPercentage', () => {
  it('keeps a percentage as it is typed, also halfway (such as "45.")', () => {
    expect(typedPercentage('45')).toBe('45');
    expect(typedPercentage('45.')).toBe('45.');
    expect(typedPercentage('45.5')).toBe('45.5');
    expect(typedPercentage('')).toBe('');
  });

  it('turns a decimal comma into a dot, as typed on a Dutch keyboard', () => {
    expect(typedPercentage('45,5')).toBe('45.5');
  });

  it('leaves out anything that is not a digit or the first decimal point', () => {
    expect(typedPercentage('4a5%')).toBe('45');
    expect(typedPercentage('-20')).toBe('20');
    expect(typedPercentage('1.2.3')).toBe('1.23');
  });

  it('keeps it at most 100', () => {
    expect(typedPercentage('150')).toBe('100');
    expect(typedPercentage('100.5')).toBe('100');
  });
});
