// The ATT&CK techniques of L3 use cases, for the charts on the MaGMa Insights tab.

export interface TechniqueCount {
  techniqueId: string;
  count: number;
}

/** Whether a rule has a technique: 'none' (chosen in the sheet) or an empty value means it has none. */
export function hasTechnique(techniqueId: unknown): techniqueId is string {
  return typeof techniqueId === 'string' && techniqueId !== '' && techniqueId !== 'none';
}

/** The number of rules per technique, the most first. A sub-technique counts on its own, not for its technique. */
export function linkedTechniqueCounts(useCases: { attackTechniqueId?: string }[]): TechniqueCount[] {
  const counts = new Map<string, number>();
  for (const { attackTechniqueId } of useCases) {
    if (hasTechnique(attackTechniqueId)) {
      counts.set(attackTechniqueId, (counts.get(attackTechniqueId) ?? 0) + 1);
    }
  }
  return [...counts].map(([techniqueId, count]) => ({ techniqueId, count })).sort((a, b) => b.count - a.count);
}
