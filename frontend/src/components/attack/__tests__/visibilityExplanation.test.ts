import { describe, it, expect } from 'vitest';
import { ownVisibilityExplanation, ownVisibilityRatio, techniqueVisibilityExplanation } from '../visibilityExplanation';

// Device completeness (0-5) of the data components in use; the others are not in use.
const scores: Record<string, number> = { 'Process Creation': 4, 'Command Execution': 1 };
const scoreOf = (component: string) => scores[component] ?? null;

describe('ownVisibilityExplanation', () => {
  it('lists the data components (in use first), then the sum', () => {
    const subTechnique = {
      name: 'PowerShell',
      data_components: ['Script Execution', 'Process Creation', 'Command Execution'],
    };
    expect(ownVisibilityExplanation(subTechnique, scoreOf)).toBe(
      [
        '33% is the average device completeness of its 3 data components:',
        '',
        '• Process Creation: 4 of 5',
        '• Command Execution: 1 of 5',
        '• Script Execution: not in use (0)',
        '',
        '(4 + 1 + 0) / 3 = 1.67 of 5 = 33%',
      ].join('\n'),
    );
  });

  it('with one data component: its device completeness', () => {
    const subTechnique = { name: 'Bash', data_components: ['Process Creation'] };
    expect(ownVisibilityExplanation(subTechnique, scoreOf)).toBe(
      [
        '80% is the device completeness of its only data component:',
        '',
        '• Process Creation: 4 of 5',
        '',
        '4 of 5 = 80%',
      ].join('\n'),
    );
  });
});

describe('techniqueVisibilityExplanation', () => {
  it('without sub-techniques: the same as for a sub-technique', () => {
    const technique = { name: 'Native API', data_components: ['Script Execution', 'Process Creation'] };
    expect(techniqueVisibilityExplanation(technique, scoreOf)).toBe(
      [
        '40% is the average device completeness of its 2 data components:',
        '',
        '• Process Creation: 4 of 5',
        '• Script Execution: not in use (0)',
        '',
        '(4 + 0) / 2 = 2 of 5 = 40%',
      ].join('\n'),
    );
  });

  it('with sub-techniques: the average of the values the tooltip shows below it', () => {
    const technique = {
      name: 'Command and Scripting Interpreter',
      data_components: ['Process Creation', 'Script Execution'],
      sub_techniques: [
        { name: 'PowerShell', data_components: ['Command Execution'] },
        { name: 'Cloud API', data_components: [] },
        { name: 'Bash', data_components: ['Script Execution'] },
      ],
    };
    expect(techniqueVisibilityExplanation(technique, scoreOf)).toBe(
      [
        '20% is the average of the technique itself and its sub-techniques, as listed below:',
        '',
        '(40% + 20% + 0%) / 3 = 20%',
        '',
        'Cloud API has no data components, so it is left out.',
      ].join('\n'),
    );
  });

  it('leaves out the technique itself when it has no data components of its own', () => {
    const technique = {
      name: 'Compromise Accounts',
      data_components: [],
      sub_techniques: [
        { name: 'Cloud Accounts', data_components: ['Process Creation'] },
        { name: 'Email Accounts', data_components: [] },
      ],
    };
    expect(techniqueVisibilityExplanation(technique, scoreOf)).toBe(
      [
        '80% is the visibility of Cloud Accounts, the only part with data components.',
        '',
        'The technique itself and Email Accounts have no data components, so they are left out.',
      ].join('\n'),
    );
  });
});

describe('ownVisibilityRatio', () => {
  it('is the visibility of a (sub-)technique from its own data components', () => {
    expect(
      ownVisibilityRatio({ name: 'Native API', data_components: ['Process Creation', 'Script Execution'] }, scoreOf),
    ).toBe(0.4);
  });
});
