// How a visibility percentage in a technique's tooltip comes about, for its pink hint: the calculation with the numbers
// that went into it. The values the tooltip already shows (the sub-techniques' percentages, the technique's own data
// components) are referred to, not repeated. The numbers come from the same calculation as the matrix
// (domain/attack/visibility.ts).
import {
  averageVisibilityPercentage,
  hasDataComponents,
  isDetectable,
  ownVisibility,
  techniqueVisibility,
  type Completeness,
  type TechniqueLike,
} from '@/domain/attack/visibility';

type Named = TechniqueLike & { name: string };

/** The DeTT&CT device completeness (0-5) of a data component in use, or null when it is not in use. */
export type ScoreOf = (component: string) => number | null;

const percent = (ratio: number) => `${(ratio * 100).toFixed(0)}%`;
const decimal = (value: number) => String(Number(value.toFixed(2)));

// The device completeness as a fraction (0-1) of every data component in use of the given (sub-)techniques.
function completenessOf(items: Named[], scoreOf: ScoreOf): Completeness {
  const completeness: Completeness = new Map();
  for (const component of items.flatMap((item) => item.data_components)) {
    const score = scoreOf(component);
    if (score !== null) {
      completeness.set(component, score / 5);
    }
  }
  return completeness;
}

// How a (sub-)technique's own visibility comes about: its data components (those in use first) with their device
// completeness, and the sum. `subject` starts the first line, such as '25%' or 'The technique itself, 20%,'.
function ownLines(item: Named, scoreOf: ScoreOf, subject: string): string[] {
  const components = [...new Set(item.data_components)].sort(
    (a, b) => Number(scoreOf(b) !== null) - Number(scoreOf(a) !== null),
  );
  const scores = components.map((component) => scoreOf(component) ?? 0);
  const ratio = ownVisibility(item, completenessOf([item], scoreOf)) ?? 0;
  const single = components.length === 1;
  return [
    single
      ? `${subject} is the device completeness of its only data component:`
      : `${subject} is the average device completeness of its ${components.length} data components:`,
    '',
    ...components.map((component) => {
      const score = scoreOf(component);
      return `• ${component}: ${score === null ? 'not in use (0)' : `${score} of 5`}`;
    }),
    '',
    `${single ? '' : `(${scores.join(' + ')}) / ${components.length} = `}${decimal(ratio * 5)} of 5 = ${percent(ratio)}`,
  ];
}

/** The visibility of a sub-technique from its own data components. */
export function ownVisibilityExplanation(item: Named, scoreOf: ScoreOf): string {
  const ratio = ownVisibility(item, completenessOf([item], scoreOf)) ?? 0;
  return ownLines(item, scoreOf, percent(ratio)).join('\n');
}

/** The visibility (0-1) of a (sub-)technique from its own data components; 0 when it has none. */
export function ownVisibilityRatio(item: Named, scoreOf: ScoreOf): number {
  return ownVisibility(item, completenessOf([item], scoreOf)) ?? 0;
}

/**
 * The visibility of a technique: without sub-techniques, from its own data components; with sub-techniques, the average
 * of the values the tooltip lists below it (the technique itself and its sub-techniques; those without data components
 * are left out). How the technique's own value comes about is explained on its own row.
 */
export function techniqueVisibilityExplanation(
  technique: Named & { sub_techniques?: Named[] },
  scoreOf: ScoreOf,
): string {
  const subTechniques: Named[] = technique.sub_techniques ?? [];
  if (subTechniques.length === 0) {
    return ownVisibilityExplanation(technique, scoreOf);
  }
  const completeness = completenessOf([technique, ...subTechniques], scoreOf);
  const parts = [technique, ...subTechniques];
  const counted = parts.filter(hasDataComponents);
  const nameOf = (item: Named) => (item === technique ? 'the technique itself' : item.name);
  const leftOut = parts.filter((item) => !hasDataComponents(item)).map(nameOf);
  const values = counted.map((item) => percent(ownVisibility(item, completeness) ?? 0));
  const total = percent(techniqueVisibility(technique, completeness) ?? 0);

  const lines =
    counted.length === 1
      ? [`${total} is the visibility of ${nameOf(counted[0]!)}, the only part with data components.`]
      : [
          `${total} is the average of the technique itself and its sub-techniques, as listed below:`,
          '',
          `(${values.join(' + ')}) / ${values.length} = ${total}`,
        ];
  if (leftOut.length > 0) {
    const names = leftOut.length === 1 ? leftOut[0]! : `${leftOut.slice(0, -1).join(', ')} and ${leftOut.at(-1)}`;
    const sentence = `${names} ${leftOut.length === 1 ? 'has' : 'have'} no data components, so ${leftOut.length === 1 ? 'it is' : 'they are'} left out.`;
    lines.push('', sentence.charAt(0).toUpperCase() + sentence.slice(1));
  }
  return lines.join('\n');
}

/**
 * The hint on the visibility chip above a column of the matrix (TacticColumn.vue): its name, an empty line, then a
 * bulleted line per fact, such as 'Visibility:\n\n• 7% over its 9 techniques\n• 2 n/a techniques left out'. The
 * techniques that ATT&CK lists no data components for do not count. Like the hint on a tactic's score in the MaGMa
 * heatmap (tacticScoreHint.ts).
 */
export function tacticVisibilityHint(techniques: TechniqueLike[]): string {
  const percentage = averageVisibilityPercentage(techniques);
  if (percentage === null) {
    return 'n/a: no data components for its techniques';
  }
  const counted = techniques.filter(isDetectable).length;
  const leftOut = techniques.length - counted;
  const plural = (count: number) => `technique${count === 1 ? '' : 's'}`;
  const facts = [
    `${Math.round(percentage)}% over its ${counted} ${plural(counted)}`,
    ...(leftOut > 0 ? [`${leftOut} n/a ${plural(leftOut)} left out`] : []),
  ];
  return ['Visibility:', '', ...facts.map((fact) => `• ${fact}`)].join('\n');
}
