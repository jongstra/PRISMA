// Values for the MaGMa heatmap: per ATT&CK technique, based on the L3 use cases that detect it.

export interface HeatmapMetrics {
  visibility: boolean;
  implementation: boolean;
  effectiveness: boolean;
}

interface UseCaseLike {
  domain: string;
  level: number;
  id: string;
  uid?: string;
  parentIds?: unknown;
  visibility?: unknown;
  implementation?: unknown;
  effectiveness?: unknown;
}

const fraction = (value: unknown) => (Number(value) || 0) / 100;

/**
 * The heatmap value (0-100) of a technique: the average, over its L3 use cases, of the product of the selected metrics.
 * With all three metrics selected this is the average weight. Null when there are no use cases or no metric is selected.
 */
export function heatmapValue(useCases: UseCaseLike[], metrics: HeatmapMetrics): number | null {
  const selected = (['visibility', 'implementation', 'effectiveness'] as const).filter((metric) => metrics[metric]);
  if (useCases.length === 0 || selected.length === 0) {
    return null;
  }
  const total = useCases.reduce(
    (sum, useCase) => sum + selected.reduce((product, metric) => product * fraction(useCase[metric]), 1),
    0,
  );
  return (total / useCases.length) * 100;
}

/** A technique of a tactic, for the score in the header of its heatmap column. */
export interface TacticTechnique {
  useCases: UseCaseLike[]; // its L3 use cases, also those of its sub-techniques
  detectable: boolean; // ATT&CK lists data components for it or one of its sub-techniques
}

/** The score of a tactic: over the techniques that count, and over those with use cases alone (null when none). */
export interface TacticScore {
  value: number | null; // 0-100; null (n/a) when no technique counts
  techniques: number;
  withUseCases: { value: number; techniques: number } | null;
}

/**
 * The score of a tactic, in the header of its heatmap column: the average heatmap value of its techniques, where one
 * without use cases counts as 0. A technique without use cases that ATT&CK lists no data components for (striped, n/a)
 * is left out, as the DeTT&CT tactic visibility leaves it out. Null when no metric is selected.
 */
export function tacticScore(techniques: TacticTechnique[], metrics: HeatmapMetrics): TacticScore | null {
  if (!metrics.visibility && !metrics.implementation && !metrics.effectiveness) {
    return null;
  }
  const counted = techniques.filter((technique) => technique.useCases.length > 0 || technique.detectable);
  const values = counted.map((technique) => heatmapValue(technique.useCases, metrics));
  const covered = values.filter((value): value is number => value !== null);
  const average = (numbers: number[]) => numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  return {
    value: counted.length === 0 ? null : average(values.map((value) => value ?? 0)),
    techniques: counted.length,
    withUseCases: covered.length === 0 ? null : { value: average(covered), techniques: covered.length },
  };
}

/**
 * The number of distinct L2 and L1 use cases above the given use cases, following parents on the level above within the
 * same domain (a parent on the wrong level does not count, as in the scores).
 */
export function ancestorCounts(useCases: UseCaseLike[], allUseCases: UseCaseLike[]): { l2: number; l1: number } {
  const byId = new Map<string, UseCaseLike[]>();
  for (const useCase of allUseCases) {
    const key = `${useCase.domain}|${useCase.id}`;
    byId.set(key, [...(byId.get(key) ?? []), useCase]);
  }
  const ancestors = new Set<UseCaseLike>();
  const queue = [...useCases];
  while (queue.length > 0) {
    const useCase = queue.pop()!;
    const parentIds = Array.isArray(useCase.parentIds) ? useCase.parentIds : [];
    const parents = parentIds.flatMap((id) => byId.get(`${useCase.domain}|${id}`) ?? []);
    for (const parent of parents.filter((candidate) => candidate.level === useCase.level - 1)) {
      if (!ancestors.has(parent)) {
        ancestors.add(parent);
        queue.push(parent);
      }
    }
  }
  const levels = [...ancestors].map((useCase) => useCase.level);
  return { l2: levels.filter((level) => level === 2).length, l1: levels.filter((level) => level === 1).length };
}
