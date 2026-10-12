// The ATT&CK domains that PRISMA supports, in the usual order, with the names the app shows for them.

export const DOMAIN_NAMES: Record<string, string> = {
  'enterprise-attack': 'Enterprise',
  'mobile-attack': 'Mobile',
  'ics-attack': 'ICS',
};

export const SUPPORTED_DOMAINS = Object.keys(DOMAIN_NAMES);

/** The names of domains for a message: 'Enterprise', 'Enterprise and ICS', 'Enterprise, Mobile and ICS'. */
export function domainNames(domains: string[]): string {
  const names = domains.map((domain) => DOMAIN_NAMES[domain] ?? domain);
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
