// Scores per data source of L3 use cases, for the charts on the MaGMa Insights tab.

export interface DataSourceMean {
  dataSource: string;
  mean: number;
  count: number; // the number of use cases with this data source
}

type Score = 'visibility' | 'implementation' | 'effectiveness';

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
    if (useCase.dataSource === undefined) {
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
