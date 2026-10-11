import { describe, it, expect } from 'vitest';
import { meanPerDataSource } from '../dataSources';

describe('meanPerDataSource', () => {
  const useCases = [
    { dataSource: 'Firewall', implementation: 80 },
    { dataSource: 'Proxy', implementation: 30 },
    { dataSource: 'Firewall', implementation: 40 },
    { implementation: 10 }, // no data source: not counted
    { dataSource: 'EDR', implementation: '50' }, // a typed value is text
  ];

  it('gives the mean of a score per data source, from the lowest mean to the highest, with the number of use cases', () => {
    expect(meanPerDataSource(useCases, 'implementation')).toEqual([
      { dataSource: 'Proxy', mean: 30, count: 1 },
      { dataSource: 'EDR', mean: 50, count: 1 },
      { dataSource: 'Firewall', mean: 60, count: 2 },
    ]);
  });

  it('counts an empty score as 0%', () => {
    expect(
      meanPerDataSource(
        [
          { dataSource: 'Firewall', effectiveness: 90 },
          { dataSource: 'Firewall' },
          { dataSource: 'Firewall', effectiveness: null },
        ],
        'effectiveness',
      ),
    ).toEqual([{ dataSource: 'Firewall', mean: 30, count: 3 }]);
  });
});
