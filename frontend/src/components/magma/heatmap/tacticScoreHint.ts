// The hint on the score chip above a column of the MaGMa heatmap (HeatmapButtonColumn.vue): the name of the score, an
// empty line, then a bulleted line per number, as in the visibility explanations in a technique's tooltip: the score
// over all the tactic's techniques (what the chip shows) and over those with use cases alone; below them, after an
// empty line, how many n/a techniques are left out. Like the hint on the visibility chip of the DeTT&CT matrix
// (tacticVisibilityHint in components/attack/visibilityExplanation.ts).
import type { TacticScore } from '@/domain/magma/heatmap';

const plural = (count: number) => `technique${count === 1 ? '' : 's'}`;

/**
 * The hint for a tactic's score, such as 'Weight:\n\n• 14% over its 10 techniques\n• 70% over the 2 with use cases'.
 * `name` is the name of the score, written out ('weight', 'implementation × effectiveness'); `leftOut` is the number of
 * n/a techniques that do not count.
 */
export function tacticScoreHint(score: TacticScore, name: string, leftOut: number): string {
  if (score.value === null) {
    return 'n/a: no data components or use cases for its techniques';
  }
  const facts = [
    `${Math.round(score.value)}% over its ${score.techniques} ${plural(score.techniques)}`,
    score.withUseCases
      ? `${Math.round(score.withUseCases.value)}% over the ${score.withUseCases.techniques} with use cases`
      : 'None has use cases yet',
  ];
  return [
    `${name[0]!.toUpperCase()}${name.slice(1)}:`,
    '',
    ...facts.map((fact) => `• ${fact}`),
    ...(leftOut > 0 ? ['', `${leftOut} n/a ${plural(leftOut)} left out`] : []),
  ].join('\n');
}
