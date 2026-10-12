import { describe, it, expect } from 'vitest';
import { domainNames, SUPPORTED_DOMAINS } from '../domains';

describe('domains', () => {
  it('lists the supported domains in the usual order', () => {
    expect(SUPPORTED_DOMAINS).toEqual(['enterprise-attack', 'mobile-attack', 'ics-attack']);
  });

  it('names domains for a message', () => {
    expect(domainNames(['enterprise-attack'])).toBe('Enterprise');
    expect(domainNames(['enterprise-attack', 'ics-attack'])).toBe('Enterprise and ICS');
    expect(domainNames(SUPPORTED_DOMAINS)).toBe('Enterprise, Mobile and ICS');
  });
});
