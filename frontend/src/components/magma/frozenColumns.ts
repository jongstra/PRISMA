// The first columns of a sheet (the delete column, ID and Use Case Name) stay at the left while the sheet scrolls
// sideways (UseCaseTable.vue): where each of them sticks, and how wide they are together.

const SPACING = 2; // the 2px between the cells of the sheet

/** Where each frozen column sticks, from the left of the sheet: the delete column, then the columns of these widths. */
export function frozenLefts(deleteWidth: number, widths: number[]): number[] {
  const lefts = [SPACING];
  [deleteWidth, ...widths.slice(0, -1)].forEach((width, index) => lefts.push(lefts[index]! + width + SPACING));
  return lefts;
}

/** How much of the sheet the frozen columns cover, with the 2px on both sides of each. */
export function frozenWidth(deleteWidth: number, widths: number[]): number {
  return [deleteWidth, ...widths].reduce((sum, width) => sum + width + SPACING, SPACING);
}
