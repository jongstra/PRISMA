import { describe, it, expect } from 'vitest';
import { readPastedValue } from '../pastedValues';

const techniques = new Set(['T1071', 'T1566', 'T1566.001']);
const read = (field: string, text: string) => readPastedValue(field, text, techniques);

describe('readPastedValue', () => {
  it('reads percentages as typed or as a spreadsheet shows them: 65, 65%, 72,5, up to 100', () => {
    expect(read('implementation', '65')).toEqual({ value: '65' });
    expect(read('implementation', ' 65% ')).toEqual({ value: '65' });
    expect(read('effectiveness', '72,5')).toEqual({ value: '72.5' });
    expect(read('inImpact', '')).toEqual({ value: '' });
    expect(read('visibility', '101')).toEqual({ problem: '"101" is not a percentage from 0 to 100' });
    expect(read('visibility', 'abc')).toEqual({ problem: '"abc" is not a percentage from 0 to 100' });
  });

  it('reads a technique by its ID, also with its name after it, and refuses an unknown one', () => {
    expect(read('attackTechniqueId', 't1566.001')).toEqual({ value: 'T1566.001' });
    expect(read('attackTechniqueId', 'T1071 Application Layer Protocol')).toEqual({ value: 'T1071' });
    expect(read('attackTechniqueId', '')).toEqual({ value: 'none' });
    expect(read('attackTechniqueId', 'T9999')).toEqual({ problem: '"T9999" is not an ATT&CK technique' });
  });

  it('reads a parent by its ID, also one that does not exist (yet), and empty as no parent', () => {
    expect(read('parentIds', ' THR-1 ')).toEqual({ value: ['THR-1'] });
    expect(read('parentIds', 'THR-1 L2 THR UC')).toEqual({ value: ['THR-1'] });
    expect(read('parentIds', '')).toEqual({ value: ['none'] });
  });

  it('reads the override as yes or no', () => {
    for (const yes of ['yes', 'TRUE', '1', 'on', 'ja']) {
      expect(read('visibilityFromAttackTechniqueOverride', yes)).toEqual({ value: true });
    }
    for (const no of ['no', 'False', '0', 'off', 'nee', '']) {
      expect(read('visibilityFromAttackTechniqueOverride', no)).toEqual({ value: false });
    }
    expect(read('visibilityFromAttackTechniqueOverride', 'maybe')).toEqual({ problem: '"maybe" is not yes or no' });
  });

  it('keeps texts, on one line in the name and data source', () => {
    expect(read('name', ' Beaconing\nto rare domains ')).toEqual({ value: 'Beaconing to rare domains' });
    expect(read('dataSource', 'Proxy\r\nlogs')).toEqual({ value: 'Proxy logs' });
    expect(read('description', 'Two\nlines ')).toEqual({ value: 'Two\nlines' });
  });
});
