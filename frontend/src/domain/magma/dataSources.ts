// Scores and counts per data source of L3 use cases, for the charts on the MaGMa Insights tab. A use case without a data
// source, or with a data source field that was emptied in the sheet, is not counted.
import { hasTechnique } from './techniques';

export interface DataSourceMean {
  dataSource: string;
  mean: number;
  count: number; // the number of use cases with this data source
}

export interface DataSourceCount {
  dataSource: string;
  count: number;
}

type Score = 'visibility' | 'implementation' | 'effectiveness';

const hasDataSource = (dataSource: unknown): dataSource is string =>
  typeof dataSource === 'string' && dataSource.trim() !== '';

/**
 * The mean of a score per data source, over the use cases that have a data source, from the lowest mean to the highest.
 * An empty score counts as 0%.
 */
export function meanPerDataSource(
  useCases: ({ dataSource?: string } & Partial<Record<Score, unknown>>)[],
  score: Score,
): DataSourceMean[] {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const useCase of useCases) {
    if (!hasDataSource(useCase.dataSource)) {
      continue;
    }
    const total = totals.get(useCase.dataSource) ?? { sum: 0, count: 0 };
    total.sum += Number(useCase[score]) || 0;
    total.count += 1;
    totals.set(useCase.dataSource, total);
  }
  return [...totals]
    .map(([dataSource, { sum, count }]) => ({ dataSource, mean: sum / count, count }))
    .sort((a, b) => a.mean - b.mean);
}

/** The number of use cases per data source, the most first. */
export function useCasesPerDataSource(useCases: { dataSource?: string }[]): DataSourceCount[] {
  const counts = new Map<string, number>();
  for (const { dataSource } of useCases) {
    if (hasDataSource(dataSource)) {
      counts.set(dataSource, (counts.get(dataSource) ?? 0) + 1);
    }
  }
  return mostFirst(counts);
}

/** The number of different techniques per data source, the most first. A rule without a technique adds none. */
export function techniquesPerDataSource(
  useCases: { dataSource?: string; attackTechniqueId?: string }[],
): DataSourceCount[] {
  const techniques = new Map<string, Set<string>>();
  for (const { dataSource, attackTechniqueId } of useCases) {
    if (!hasDataSource(dataSource)) {
      continue;
    }
    const ofDataSource = techniques.get(dataSource) ?? new Set<string>();
    if (hasTechnique(attackTechniqueId)) {
      ofDataSource.add(attackTechniqueId);
    }
    techniques.set(dataSource, ofDataSource);
  }
  return mostFirst(new Map([...techniques].map(([dataSource, set]) => [dataSource, set.size])));
}

function mostFirst(counts: Map<string, number>): DataSourceCount[] {
  return [...counts].map(([dataSource, count]) => ({ dataSource, count })).sort((a, b) => b.count - a.count);
}
