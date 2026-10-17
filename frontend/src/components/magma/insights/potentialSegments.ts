// The improvement potential of an L3 use case, split over visibility, implementation and effectiveness (each in its own
// colour): each part is in proportion to how far that score is from 100%. Used by the two improvement potential charts.
import { SCORE_COLORS } from '@/components/common/barColor';

export function potentialSegments(useCase: {
  visibility?: unknown;
  implementation?: unknown;
  effectiveness?: unknown;
  potential?: unknown;
}) {
  const visibility = Number(useCase.visibility);
  const implementation = Number(useCase.implementation);
  const effectiveness = Number(useCase.effectiveness);
  const potential = Number(useCase.potential);
  const missing = 300 - visibility - implementation - effectiveness;
  return [
    { value: ((100 - visibility) / missing) * potential, color: SCORE_COLORS.visibility },
    { value: ((100 - implementation) / missing) * potential, color: SCORE_COLORS.implementation },
    { value: ((100 - effectiveness) / missing) * potential, color: SCORE_COLORS.effectiveness },
  ];
}

// The pink hint on an improvement potential bar: the three scores behind it, so the parts can be read as numbers.
export function potentialHint(useCase: { visibility?: unknown; implementation?: unknown; effectiveness?: unknown }) {
  const score = (value: unknown) => {
    const number = value === null || value === undefined || value === '' ? NaN : Number(value);
    return Number.isNaN(number) ? '–' : `${Number(number.toFixed(2))}%`;
  };
  return [
    `Visibility ${score(useCase.visibility)}`,
    `Implementation ${score(useCase.implementation)}`,
    `Effectiveness ${score(useCase.effectiveness)}`,
  ].join(' · ');
}
