// The undo history of the MaGMa use cases: before each change, a copy of the state is kept as a step. Undoing a step
// gives back the state from before it (and keeps the current state to redo it); redoing gives back the state after it.
// The changes of one group, such as typing in one cell, make one step until the group ends (the cell is left). A step
// that changed nothing (its state is the state after it) is passed over.

/** Where a change was made: the sheet (tab) and the domain, so undo can show it. */
export interface Place {
  tab: string;
  domain: string;
}

export interface Step<S> {
  state: S; // the state before the change (on the undo list) or after it (on the redo list)
  description: string; // what was changed, such as 'Implementation of DOS-1-B'
  place: Place;
}

export interface History<S> {
  undo: Step<S>[];
  redo: Step<S>[];
  group: string | null; // the group of the last step while it is still open
}

const LIMIT = 100; // the number of steps that are kept

export const emptyHistory = <S>(): History<S> => ({ undo: [], redo: [], group: null });

/** Whether a change in this group belongs to the last step: the group is still open. */
export const inOpenGroup = <S>(history: History<S>, group: string | null) => group !== null && group === history.group;

/**
 * Keeps the state from before a change as a step, and forgets what could be redone. A change in the same open group as
 * the last step adds no step: that step already has the state from before the group started.
 */
export function recordStep<S>(history: History<S>, step: Step<S>, group: string | null = null): History<S> {
  if (inOpenGroup(history, group)) {
    return history;
  }
  const undo = history.undo.at(-1)?.state === step.state ? history.undo.slice(0, -1) : history.undo;
  return { undo: [...undo, step].slice(-LIMIT), redo: [], group };
}

/** Ends the open group, so the next change makes a new step. */
export const endGroup = <S>(history: History<S>): History<S> => ({ ...history, group: null });

/** The last step to undo (its state is the one to go back to), and the history with the current state to redo it. */
export function undoStep<S>(history: History<S>, current: S): { step: Step<S>; history: History<S> } | null {
  let undo = history.undo;
  while (undo.at(-1)?.state === current) {
    undo = undo.slice(0, -1);
  }
  const step = undo.at(-1);
  if (!step) {
    return null;
  }
  return {
    step,
    history: { undo: undo.slice(0, -1), redo: [...history.redo, { ...step, state: current }], group: null },
  };
}

/** The last undone step to redo (its state is the one after the change), and the history to undo it again. */
export function redoStep<S>(history: History<S>, current: S): { step: Step<S>; history: History<S> } | null {
  const step = history.redo.at(-1);
  if (!step) {
    return null;
  }
  return {
    step,
    history: { undo: [...history.undo, { ...step, state: current }], redo: history.redo.slice(0, -1), group: null },
  };
}
