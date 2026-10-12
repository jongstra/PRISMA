import { describe, it, expect } from 'vitest';
import { meanPerDataSource, techniquesPerDataSource, useCasesPerDataSource } from '../dataSources';

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

  it('leaves out a data source field that was emptied in the sheet', () => {
    expect(
      meanPerDataSource(
        [
          { dataSource: '', visibility: 10 },
          { dataSource: '  ', visibility: 20 },
          { dataSource: 'EDR', visibility: 30 },
        ],
        'visibility',
      ),
    ).toEqual([{ dataSource: 'EDR', mean: 30, count: 1 }]);
  });
});

describe('useCasesPerDataSource', () => {
  it('counts the use cases per data source, the most first, without empty data sources', () => {
    expect(
      useCasesPerDataSource([
        { dataSource: 'Proxy' },
        { dataSource: 'EDR' },
        { dataSource: 'EDR' },
        { dataSource: '' },
        {},
      ]),
    ).toEqual([
      { dataSource: 'EDR', count: 2 },
      { dataSource: 'Proxy', count: 1 },
    ]);
  });
});

describe('techniquesPerDataSource', () => {
  it('counts the different techniques per data source, the most first', () => {
    expect(
      techniquesPerDataSource([
        { dataSource: 'Proxy', attackTechniqueId: 'T1071' },
        { dataSource: 'EDR', attackTechniqueId: 'T1059' },
        { dataSource: 'EDR', attackTechniqueId: 'T1059' },
        { dataSource: 'EDR', attackTechniqueId: 'T1059.001' },
        { dataSource: '', attackTechniqueId: 'T1566' },
      ]),
    ).toEqual([
      { dataSource: 'EDR', count: 2 },
      { dataSource: 'Proxy', count: 1 },
    ]);
  });

  it('does not count a rule without a technique, but still lists its data source', () => {
    expect(
      techniquesPerDataSource([
        { dataSource: 'Sysmon', attackTechniqueId: 'T1030' },
        { dataSource: 'Sysmon', attackTechniqueId: 'none' },
        { dataSource: 'Firewall', attackTechniqueId: 'none' },
        { dataSource: 'Firewall' },
      ]),
    ).toEqual([
      { dataSource: 'Sysmon', count: 1 },
      { dataSource: 'Firewall', count: 0 },
    ]);
  });
});
