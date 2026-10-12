import { describe, it, expect } from 'vitest';
import { techniqueUrl } from '../links';

describe('techniqueUrl', () => {
  it('links a technique to its page on the ATT&CK website', () => {
    expect(techniqueUrl('T1566')).toBe('https://attack.mitre.org/techniques/T1566/');
  });

  it('links a sub-technique to its own page, below its technique', () => {
    expect(techniqueUrl('T1566.001')).toBe('https://attack.mitre.org/techniques/T1566/001/');
  });
});
