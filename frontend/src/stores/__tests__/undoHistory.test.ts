import { describe, it, expect } from 'vitest';
import { emptyHistory, endGroup, recordStep, redoStep, undoStep } from '../undoHistory';

const place = { tab: 'L3', domain: 'enterprise-attack' };

describe('undoHistory', () => {
  it('undoes a step by giving back the state from before it, and redoes it by giving back the state after it', () => {
    let history = recordStep(emptyHistory<string>(), { state: 'before', description: 'Name of A', place });
    const undone = undoStep(history, 'after')!;
    expect(undone.step).toEqual({ state: 'before', description: 'Name of A', place });
    history = undone.history;
    const redone = redoStep(history, 'before')!;
    expect(redone.step).toEqual({ state: 'after', description: 'Name of A', place });
    expect(undoStep(redone.history, 'after')!.step.state).toBe('before');
  });

  it('has nothing to undo or redo at first', () => {
    expect(undoStep(emptyHistory<string>(), 'now')).toBeNull();
    expect(redoStep(emptyHistory<string>(), 'now')).toBeNull();
  });

  it('makes one step of the changes of one group, such as typing in one cell, until the group ends', () => {
    const step = (state: string) => ({ state, description: 'Name of A', place });
    let history = recordStep(emptyHistory<string>(), step('""'), 'A:name');
    history = recordStep(history, step('"4"'), 'A:name');
    history = recordStep(history, step('"45"'), 'A:name');
    expect(history.undo).toHaveLength(1);
    expect(history.undo[0]!.state).toBe('""');
    history = recordStep(endGroup(history), step('"456"'), 'A:name');
    expect(history.undo).toHaveLength(2);
    history = recordStep(history, step('x'), 'B:name');
    expect(history.undo).toHaveLength(3);
  });

  it('forgets what could be redone once a new change is made', () => {
    let history = recordStep(emptyHistory<string>(), { state: 'one', description: 'A', place });
    history = undoStep(history, 'two')!.history;
    expect(history.redo).toHaveLength(1);
    history = recordStep(history, { state: 'one', description: 'B', place });
    expect(history.redo).toHaveLength(0);
  });

  it('keeps the last 100 steps', () => {
    let history = emptyHistory<number>();
    for (let i = 0; i < 105; i++) {
      history = recordStep(history, { state: i, description: `${i}`, place });
    }
    expect(history.undo).toHaveLength(100);
    expect(history.undo[0]!.state).toBe(5);
  });

  it('passes over steps that changed nothing, such as a refused rename', () => {
    let history = recordStep(emptyHistory<string>(), { state: 'one', description: 'A', place });
    history = recordStep(history, { state: 'two', description: 'B', place });
    history = recordStep(history, { state: 'two', description: 'C', place }); // B changed nothing: C replaces it
    expect(history.undo.map((step) => step.description)).toEqual(['A', 'C']);
    const undone = undoStep(history, 'two')!; // C changed nothing either: A is undone
    expect(undone.step.description).toBe('A');
    expect(undone.history.undo).toHaveLength(0);
  });
});
