import { describe, it, expect } from 'vitest';
import { average, businessRisks, cumulativeUseCases, distinctCount } from '../summary';

const IN = { id: 'IN', uid: 'IN', permanent: true, weight: 41 };
const THR = { id: 'THR', uid: 'THR', permanent: true, weight: 29 };
const risk = (id: string, value?: number) => ({ id, uid: id, risk: value });

describe('businessRisks', () => {
  it('leaves out cumulative IN and THROUGH and puts the highest risk first', () => {
    const risks = businessRisks([risk('RAN', 62.5), THR, risk('DOS', 81.3), IN, risk('ESP', 55.1)]);
    expect(risks.map((useCase) => useCase.id)).toEqual(['DOS', 'RAN', 'ESP']);
  });

  it('orders equal risks by ID, with numbers in their natural order', () => {
    const risks = businessRisks([risk('R-10', 50), risk('R-2', 50), risk('A', 50)]);
    expect(risks.map((useCase) => useCase.id)).toEqual(['A', 'R-2', 'R-10']);
  });

  it('counts a risk that is not calculated yet as 0', () => {
    expect(businessRisks([risk('NEW'), risk('OLD', 10)]).map((useCase) => useCase.id)).toEqual(['OLD', 'NEW']);
  });
});

describe('cumulativeUseCases', () => {
  it('gives cumulative IN and THROUGH, in that order', () => {
    expect(cumulativeUseCases([risk('DOS', 80), THR, IN])).toEqual([IN, THR]);
  });

  it('leaves out one that is missing', () => {
    expect(cumulativeUseCases([risk('DOS', 80), THR])).toEqual([THR]);
  });
});

describe('average', () => {
  it('averages percentages, also when they are typed in as text', () => {
    expect(average([20, '40', 60])).toBe(40);
  });

  it('counts an empty score as 0', () => {
    expect(average([50, '', null])).toBeCloseTo(16.667, 3);
  });

  it('is null without values, instead of NaN', () => {
    expect(average([])).toBeNull();
  });
});

describe('distinctCount', () => {
  it('counts the different values, without none and empty ones', () => {
    expect(distinctCount(['T1566', 'T1059', 'T1566', 'none', '', undefined, null])).toBe(2);
  });
});
