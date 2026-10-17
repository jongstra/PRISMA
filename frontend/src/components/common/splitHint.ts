// The pink hint on a chart row whose bar has several parts: the count of each part, such as
// "77 techniques + 220 sub-techniques".
export function splitHint(parts: [count: number, one: string, many: string][]): string {
  return parts.map(([count, one, many]) => `${count} ${count === 1 ? one : many}`).join(' + ');
}
