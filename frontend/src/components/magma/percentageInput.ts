// A percentage typed in a sheet. The percentage fields are text fields: a number field would show the browser's language
// (0,00 in Dutch) while the other numbers in the sheet show a decimal point. So what is typed is kept to a percentage here.

/** The typed text as a percentage: digits with at most one decimal point (a comma counts as one), and at most 100. */
export function typedPercentage(text: string): string {
  const [whole = '', ...decimals] = text
    .replaceAll(',', '.')
    .replace(/[^\d.]/g, '')
    .split('.');
  const percentage = decimals.length > 0 ? `${whole}.${decimals.join('')}` : whole;
  return Number(percentage) > 100 ? '100' : percentage;
}
