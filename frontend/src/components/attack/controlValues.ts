// The texts that the controls of the DeTT&CT page show: the values at the top right of the slider boxes, and what the
// platforms filter lets through (see AttackView.vue).

/** The selected visibility range, in whole percentages: '0 – 100'. */
export function visibilityRangeText(minRatio: number, maxRatio: number): string {
  return `${Math.round(minRatio * 100)} – ${Math.round(maxRatio * 100)}`;
}

const OCCURRENCE_LEVELS = ['Low', 'Medium', 'High', 'Very High'];

/** The name of a level of the minimum total occurrence slider (0 to 3). */
export function occurrenceLevel(value: number): string {
  return OCCURRENCE_LEVELS[Math.min(Math.max(Math.round(value), 0), OCCURRENCE_LEVELS.length - 1)]!;
}

/** What a filter lets through: 'All platforms', '3 of 11 platforms' or 'No platforms'. */
export function filterSummary(active: number, total: number, noun: string): string {
  if (active === total) {
    return `All ${noun}`;
  }
  return active === 0 ? `No ${noun}` : `${active} of ${total} ${noun}`;
}
