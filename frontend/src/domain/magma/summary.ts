// The numbers on the MaGMa page's Summary tab. The business risks are the L1 use cases other than cumulative IN and
// THROUGH (the permanent ones); their risk is the chance of missing an attack (see calculations.ts).

/** The business risks, the highest risk first; equal risks in the order of their IDs. */
export function businessRisks<T extends { id: string; permanent?: boolean; risk?: number }>(l1UseCases: T[]): T[] {
  return l1UseCases
    .filter((useCase) => !useCase.permanent)
    .sort((a, b) => (b.risk ?? 0) - (a.risk ?? 0) || a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/** Cumulative IN and THROUGH, in that order, as far as they exist. */
export function cumulativeUseCases<T extends { uid?: string }>(l1UseCases: T[]): T[] {
  return ['IN', 'THR'].flatMap((uid) => l1UseCases.filter((useCase) => useCase.uid === uid));
}

/** The average of percentages (possibly typed in as text; an empty one counts as 0), or null when there are none. */
export function average(values: unknown[]): number | null {
  return values.length > 0
    ? values.reduce<number>((sum, value) => sum + (Number(value) || 0), 0) / values.length
    : null;
}

/** The number of different values, without 'none' and empty ones: e.g. the techniques or data sources of L3 rules. */
export function distinctCount(values: unknown[]): number {
  return new Set(values.filter((value) => value && value !== 'none')).size;
}
