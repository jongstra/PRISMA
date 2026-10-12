import { describe, it, expect } from 'vitest';
import { searchOptions, searchTechniques } from '../optionSearch';

const techniques = [
  { id: 'T1059', name: 'Command and Scripting Interpreter' },
  { id: 'T1059.001', name: 'Command and Scripting Interpreter: PowerShell' },
  { id: 'T1566', name: 'Phishing' },
  { id: 'T1566.001', name: 'Phishing: Spearphishing Attachment' },
  { id: 'T1566.002', name: 'Phishing: Spearphishing Link' },
  { id: 'T1598.002', name: 'Phishing for Information: Spearphishing Attachment' },
];
const ids = (query: string) => searchTechniques(techniques, query).map((technique) => technique.id);

describe('searchTechniques', () => {
  it('gives all techniques for an empty search', () => {
    expect(ids('')).toEqual(techniques.map((technique) => technique.id));
    expect(ids('   ')).toHaveLength(techniques.length);
  });

  it('finds techniques by the start of their ID, with or without the T', () => {
    expect(ids('T1566')).toEqual(['T1566', 'T1566.001', 'T1566.002']);
    expect(ids('1566')).toEqual(['T1566', 'T1566.001', 'T1566.002']);
    expect(ids('t1566.00')).toEqual(['T1566.001', 'T1566.002']);
    expect(ids('566')).toEqual([]); // the middle of an ID is not a match
  });

  it('finds techniques by words in their name, in any order and case', () => {
    expect(ids('powershell')).toEqual(['T1059.001']);
    expect(ids('spear attach')).toEqual(['T1566.001', 'T1598.002']);
    expect(ids('Attachment SPEAR')).toEqual(['T1566.001', 'T1598.002']);
  });

  it('combines an ID and words of the name', () => {
    expect(ids('1566 spear')).toEqual(['T1566.001', 'T1566.002']);
    expect(ids('1566 voice')).toEqual([]);
  });
});

describe('searchOptions', () => {
  const useCases = [
    { id: 'DOS-1', name: 'DDoS detection' },
    { id: 'FIN-1', name: 'Fraud in payments' },
    { id: 'FIN-2', name: 'Insider fraud' },
  ];
  const found = (query: string) => searchOptions(useCases, query).map((useCase) => useCase.id);

  it('finds options by any part of their ID or name, ignoring case', () => {
    expect(found('')).toEqual(['DOS-1', 'FIN-1', 'FIN-2']);
    expect(found('fin')).toEqual(['FIN-1', 'FIN-2']);
    expect(found('-2')).toEqual(['FIN-2']);
    expect(found('FRAUD')).toEqual(['FIN-1', 'FIN-2']);
    expect(found('fin insider')).toEqual(['FIN-2']);
    expect(found('ddos fin')).toEqual([]);
  });
});
