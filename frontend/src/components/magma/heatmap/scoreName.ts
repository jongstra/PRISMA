// The name of the score the heatmap colours by: the product of the scores ticked in the Score filter. The short name
// fits on the button and in the legend label; the long one is shown on hover.
import type { HeatmapMetrics } from '@/domain/magma/heatmap';

const SCORES = ['visibility', 'implementation', 'effectiveness'] as const;

export function scoreName(metrics: HeatmapMetrics): { short: string; long: string } {
  const ticked = SCORES.filter((score) => metrics[score]);
  if (ticked.length === SCORES.length) {
    return { short: 'weight', long: `weight: ${ticked.join(' × ')}` };
  }
  if (ticked.length === 0) {
    return { short: 'no score', long: 'no score: tick at least one score to colour the heatmap' };
  }
  const long = ticked.join(' × ');
  return { short: ticked.length === 1 ? long : ticked.map((score) => score[0]!.toUpperCase()).join(' × '), long };
}
