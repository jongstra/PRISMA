// Links to the ATT&CK website.

/** The page of a technique (T1566 → /techniques/T1566/) or sub-technique (T1566.001 → /techniques/T1566/001/). */
export function techniqueUrl(techniqueId: string): string {
  return `https://attack.mitre.org/techniques/${techniqueId.replace('.', '/')}/`;
}
