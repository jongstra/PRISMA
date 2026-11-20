import { defineStore } from 'pinia';
import type { SheetSort } from '@/components/magma/useCaseSort';
import {
  emptyHistory,
  endGroup,
  inOpenGroup,
  recordStep,
  redoStep,
  undoStep,
  type History,
  type Place,
  type Step,
} from './undoHistory';
import { v4 as uuidv4 } from 'uuid';
import { tacticsStore } from '@/stores/tactics';
import { recalculateUseCases } from '@/domain/magma/calculations';
import {
  findMultipleParents,
  findParentCycles,
  findUnknownParents,
  findWrongLevelParents,
  idProblem,
  parentProblem,
  percentageProblem,
  readAsMeant,
} from '@/domain/magma/validation';
import { exportNumber, magmaFileDomains } from '@/io/magmaFile';
import { SUPPORTED_DOMAINS } from '@/domain/domains';

// A percentage (0-100) of a use case. What is typed in the sheet stays text (such as '45', or '' for an empty field), and
// a visibility from the DeTT&CT file is stored as text with two decimals ('45.00'); the calculations use Number().
export type Percentage = number | string | null;

export interface UseCase {
  domain: string;
  id: string;
  uid: string;
  name: string;
  description: string;
  level: number;
  parentIds?: Array<string>;
  attackTechniqueId?: string;
  dataSource?: string; // Self-defined data source by user.
  visibilityFromAttackTechnique?: boolean;
  visibilityFromAttackTechniqueOverride?: boolean;
  visibility?: Percentage;
  implementation?: Percentage;
  effectiveness?: Percentage;
  weight?: number | null;
  potential?: number | null;
  invalidVisibility?: boolean;
  invalidId?: boolean;
  invalidParentIds?: boolean;
  permanent?: boolean;
  inImpact?: Percentage;
  thrImpact?: Percentage;
  outImpact?: Percentage;
  risk?: number;
}

// A use case as it is read from a MaGMa file: each field can be missing or have the wrong type, until addExistingUseCase
// checks it.
export type UseCaseFromFile = Partial<Record<keyof UseCase, unknown>>;

// The result of adding use cases from a file: how many were added, why the others were not, and warnings about the
// added ones (see importSummary in io/magmaFile.ts).
export interface ImportResult {
  imported: number;
  failed: string[];
  warnings: string[];
}

// The fields that can be changed in the sheets.
type UpdatedFields = Partial<
  Pick<
    UseCase,
    | 'name'
    | 'id'
    | 'description'
    | 'dataSource'
    | 'parentIds'
    | 'attackTechniqueId'
    | 'visibilityFromAttackTechniqueOverride'
    | 'visibility'
    | 'implementation'
    | 'effectiveness'
    | 'inImpact'
    | 'thrImpact'
    | 'outImpact'
  >
>;

// The percentages of a use case that are entered by the user or imported.
const PERCENTAGE_FIELDS = [
  'visibility',
  'implementation',
  'effectiveness',
  'inImpact',
  'thrImpact',
  'outImpact',
] as const;

// A visibility from the DeTT&CT file, as text with two decimals (none counts as 0).
const formatPercentage = (percentage: number | null) => Number(percentage).toFixed(2);

export const magmaStore = defineStore('magma', {
  state: () => ({
    useCases: [] as UseCase[],
    activeTab: 'L1',
    heatmapVisibility: true,
    heatmapImplementation: true,
    heatmapEffectiveness: true,
    heatmapFilterValue: 0,
    heatmapSearchQuery: '' as string,
    heatmapOnlyWithUseCases: false, // the heatmap only shows the techniques with L3 use cases
    savedUseCases: '[]', // what the user had entered at the last load or save, see hasUnsavedChanges
    sheetSorts: {} as Partial<Record<string, SheetSort | null>>, // the column each sheet (L1, L2, L3) is sorted by
    history: emptyHistory<string>(), // the undo history: copies of the use cases (as JSON) from before each change
  }),

  getters: {
    // What undo and redo would change, such as 'Implementation of DOS-1-B', or null when there is nothing to undo or redo.
    undoDescription: (state) => state.history.undo.at(-1)?.description ?? null,
    redoDescription: (state) => state.history.redo.at(-1)?.description ?? null,

    getUseCaseById(state) {
      return (id: string, domain?: string) =>
        state.useCases.find((useCase) => useCase['id'] === id && (!domain || useCase.domain === domain));
    },
    getUseCaseByUid(state) {
      return (uid: string, domain?: string) =>
        state.useCases.find((useCase) => useCase['uid'] === uid && (!domain || useCase.domain === domain));
    },
    getAllUseCases(state) {
      return (domain?: string) =>
        state.useCases.filter((useCase) => useCase['level'] === 1 && (!domain || useCase.domain === domain));
    },
    L1UseCases(state) {
      return (domain?: string) =>
        state.useCases.filter((useCase) => useCase['level'] === 1 && (!domain || useCase.domain === domain));
    },
    L2UseCases(state) {
      return (domain?: string) =>
        state.useCases.filter((useCase) => useCase['level'] === 2 && (!domain || useCase.domain === domain));
    },
    L3UseCases(state) {
      return (domain?: string) =>
        state.useCases.filter((useCase) => useCase['level'] === 3 && (!domain || useCase.domain === domain));
    },
    activeTabUseCases(state) {
      return (domain?: string) => {
        if (state.activeTab === 'L1') {
          return this.L1UseCases(domain);
        }
        if (state.activeTab === 'L2') {
          return this.L2UseCases(domain);
        }
        if (state.activeTab === 'L3') {
          return this.L3UseCases(domain);
        }
        return []; // Default case
      };
    },
    domainSortedUseCases(state) {
      const domainOrder: Record<string, number> = {
        'enterprise-attack': 1,
        'mobile-attack': 2,
        'ics-attack': 3,
      };

      // By ID with the numbers in it in order (L3-2 before L3-10), the same on every computer (English rules).
      return state.useCases.slice().sort((a, b) => {
        return domainOrder[a.domain] - domainOrder[b.domain] || a.id.localeCompare(b.id, 'en', { numeric: true });
      });
    },
    getAllIds(state) {
      return (domain?: string) =>
        state.useCases.filter((useCase) => !domain || useCase.domain === domain).map((useCase) => useCase['id']);
    },
    getAllUids(state) {
      return (domain?: string) =>
        state.useCases.filter((useCase) => !domain || useCase.domain === domain).map((useCase) => useCase['uid']);
    },
    getParentUseCases(state) {
      return (useCase: UseCase) => {
        if (useCase && Array.isArray(useCase.parentIds)) {
          const parentIds = useCase.parentIds;
          const parentUseCases = state.useCases.filter(
            (parentUseCase) =>
              parentIds.includes(parentUseCase['id']) &&
              parentUseCase.domain === useCase.domain &&
              parentUseCase.level === useCase.level - 1,
          );
          return parentUseCases;
        } else {
          return [];
        }
      };
    },
    getChildUseCases(state) {
      return (useCase: UseCase) => {
        const childUseCases = state.useCases.filter(
          (childUseCase) =>
            Array.isArray(childUseCase['parentIds']) &&
            childUseCase['parentIds'].includes(useCase.id) &&
            childUseCase.domain === useCase.domain &&
            childUseCase.level === useCase.level + 1,
        );
        return childUseCases;
      };
    },
    // The use cases in a domain that name an ID as their parent, whatever their level: a rename moves them all along,
    // also one on the wrong level (which does not count for that parent, see getChildUseCases).
    useCasesWithParent(state) {
      return (id: string, domain: string) =>
        state.useCases.filter(
          (useCase) => useCase.domain === domain && Array.isArray(useCase.parentIds) && useCase.parentIds.includes(id),
        );
    },
    getGrandChildUseCases() {
      return (useCase: UseCase) => {
        // A rule with two parents under the same use case is listed once.
        const grandChildUseCases = this.getChildUseCases(useCase).flatMap((child) => this.getChildUseCases(child));
        return [...new Set(grandChildUseCases)];
      };
    },
    // The L3 use cases in a domain that detect a technique or one of its sub-techniques (e.g. T1566 and T1566.001).
    l3UseCasesForTechnique(state) {
      return (techniqueId: string, domain: string) =>
        state.useCases.filter(
          (useCase) =>
            useCase.level === 3 &&
            useCase.domain === domain &&
            (useCase.attackTechniqueId === techniqueId || useCase.attackTechniqueId?.startsWith(`${techniqueId}.`)),
        );
    },
  },

  actions: {
    addNewUseCase(level: number = 0, domain: string) {
      // Filter existing use cases to find those that match the specified level
      const filteredUseCases = this.useCases.filter(
        (useCase) => useCase['level'] === level && (!domain || useCase.domain === domain),
      );

      // Extract numeric suffixes from the IDs of these use cases
      let maxSuffix = 0;
      for (const useCase of filteredUseCases) {
        const suffixPart = useCase['id'].split('-')[1];
        if (suffixPart) {
          const suffix = parseInt(suffixPart);
          if (!isNaN(suffix)) {
            maxSuffix = Math.max(maxSuffix, suffix);
          }
        }
      }

      // Increment the highest numeric suffix to generate a new unique ID
      const newSuffix = maxSuffix + 1;

      // Generate the new use case ID.
      const uid = uuidv4();

      // Create new UseCase object.
      const useCase: UseCase = {
        domain: domain,
        level,
        id: `L${level}-${newSuffix.toString()}`,
        // parentIds: ['none'],
        name: '',
        description: '',
        attackTechniqueId: 'none',
        visibilityFromAttackTechnique: false,
        visibilityFromAttackTechniqueOverride: false,
        visibility: null,
        implementation: null,
        effectiveness: null,
        weight: 0,
        potential: 100,
        uid: uid,
        invalidVisibility: false,
        invalidId: false,
        invalidParentIds: false,
      };

      // Default IN/THR/OUT impacts of 100/0/0, which add up to 100% (so the cells do not turn red). Only for level 1 use cases.
      if (level === 1) {
        useCase.inImpact = 100;
        useCase.thrImpact = 0;
        useCase.outImpact = 0;
      }

      // Add the new use case to the store, and recalculate (a new L1 use case gets a risk straight away).
      this.useCases.push(useCase);
      this.recalculateAll();
    },

    addExistingUseCase(useCase: UseCase, recalculate = true) {
      const tactics = tacticsStore();

      // Check that the domain is set to a valid value.
      if (!['enterprise-attack', 'mobile-attack', 'ics-attack'].includes(useCase.domain)) {
        throw new Error(
          `Use case domain "${useCase.domain}" is not supported. Please use one of: 'enterprise-attack', 'mobile-attack', 'ics-attack'. Use case: ${JSON.stringify(useCase)}`,
        );
      }

      // Ensure that the use case has an ID, as text.
      if (!useCase.id) {
        throw new Error(`The use case has no ID. Use case: ${JSON.stringify(useCase)}`);
      }
      const problem = idProblem(useCase.id) ?? parentProblem(useCase);
      if (problem) {
        throw new Error(problem);
      }

      // Catch duplicate IDs.
      if (this.getUseCaseById(useCase.id, useCase.domain)) {
        throw new Error(
          `Use case with id "${useCase.id}" in domain "${useCase.domain}" already exists. Use case: ${JSON.stringify(useCase)}`,
        );
      }

      // Check that the use case has a level.
      if (!useCase.level) {
        throw new Error(`No use case level found. Use case: ${JSON.stringify(useCase)}`);
      }

      // Check that the use case level is valid.
      if (useCase.level !== 1 && useCase.level !== 2 && useCase.level !== 3) {
        throw new Error(`Use case level is incorrect. Use case: ${JSON.stringify(useCase)}`);
      }

      // Check that the visibility, implementation, effectiveness and IN/THR/OUT impact are empty or a number from 0 to 100.
      // Older versions of PRISMA could save empty impacts as NaN (.nan); those are read as empty.
      for (const field of PERCENTAGE_FIELDS) {
        if (Number.isNaN(useCase[field])) {
          delete useCase[field];
        }
        const problem = percentageProblem(useCase[field]);
        if (problem) {
          throw new Error(
            `Use case "${useCase.id}" in domain "${useCase.domain}": ${field} "${useCase[field]}" is not valid; ${problem}.`,
          );
        }
      }

      // If visibilityFromAttackTechniqueOverride is not set, use the default value 'false'.
      if (!useCase.visibilityFromAttackTechniqueOverride) {
        useCase.visibilityFromAttackTechniqueOverride = false;
      }

      // Ensure that visibilityFromAttackTechniqueOverride is a boolean.
      if (typeof useCase.visibilityFromAttackTechniqueOverride !== 'boolean') {
        throw new Error(
          `Use case has an invalid (non-boolean) value for property visibilityFromAttackTechniqueOverride. Use case: ${JSON.stringify(useCase)}`,
        );
      }

      // If an attackTechnique is set, check that it exists and is valid.
      if (useCase.attackTechniqueId && useCase.attackTechniqueId !== 'none') {
        if (!tactics.domainTechniqueByIdMap(useCase.domain).hasOwnProperty(useCase.attackTechniqueId)) {
          throw new Error(
            `Use case attackTechniqueId "${useCase.attackTechniqueId}" does not exist in the specified domain. Use case: ${JSON.stringify(useCase)}`,
          );
        } else {
          // If the useCase.attackTechniqueId is valid, update the use case visibility based on the visibility of the attack technique.
          // Handle a possible visibility override.
          if (!useCase.visibilityFromAttackTechniqueOverride) {
            useCase.visibility = formatPercentage(
              tactics.getDomainTechniqueVisibilityPercentageById(useCase.attackTechniqueId, useCase.domain),
            );
            useCase.visibilityFromAttackTechnique = true;
          } else {
            useCase.visibilityFromAttackTechnique = false;
          }
        }
      }

      // If no attackTechnique is set, use the default value 'none'.
      if (!useCase.attackTechniqueId) {
        useCase.attackTechniqueId = 'none';
        useCase.visibilityFromAttackTechnique = false;
      }

      // Add a unique ID and some organizational parameters to the use case, and add it to the store.
      useCase.uid = uuidv4();
      useCase.invalidVisibility = false;
      useCase.invalidId = false;
      useCase.invalidParentIds = false;
      useCase.domain = useCase.domain;
      this.useCases.push(useCase);

      // Recalculate the derived values (an import recalculates once, after adding all use cases).
      if (recalculate) {
        this.recalculateAll();
      }
    },

    removeUseCaseByUid(uid: string) {
      this.removeUseCasesByUid([uid]);
    },

    // Removes the use cases, and recalculates the values that depended on them once, also for a whole sheet. Their
    // child use cases are kept and lose their parent; the editor warns about this before deleting.
    removeUseCasesByUid(uids: string[]) {
      const known = new Set(this.useCases.map((useCase) => useCase.uid));
      const unknown = uids.find((uid) => !known.has(uid));
      if (unknown !== undefined) {
        throw new Error(`No use case with uid "${unknown}" exists.`);
      }
      const removed = new Set(uids);
      this.useCases = this.useCases.filter((useCase) => !removed.has(useCase.uid));
      this.recalculateAll();
    },

    // Why renaming a use case to newId is refused, or null when it can be renamed (also when the ID stays the same).
    renameProblem(uid: string, newId: string, renamedUids: string[] = []): string | null {
      const useCase = this.getUseCaseByUid(uid);
      if (!useCase) {
        return `No use case with uid "${uid}" exists.`;
      }
      if (useCase.permanent) {
        return `Use case "${useCase.id}" cannot be renamed.`;
      }
      const id = newId.trim();
      if (id === '') {
        return 'The ID of a use case cannot be empty.';
      }
      // IDs are references: in the parent column, and as comma-separated lists in the MaGMa Excel file.
      if (/[\s,]/.test(id)) {
        return 'An ID cannot contain spaces or commas.';
      }
      if (id === useCase.id) {
        return null;
      }
      // An ID that another use case gives up in the same rename (renamedUids) is free.
      const holder = this.getUseCaseById(id, useCase.domain);
      if (id === 'none' || (holder && !renamedUids.includes(holder.uid))) {
        return `A use case with ID "${id}" already exists in this domain. Choose another ID.`;
      }
      return null;
    },

    // Rename a use case. Its child use cases (in the same domain) move along to the new ID. Returns a message explaining
    // why the rename is refused (see renameProblem), or null when the use case was renamed.
    renameUseCase(uid: string, newId: string): string | null {
      const problem = this.renameProblem(uid, newId);
      const useCase = this.getUseCaseByUid(uid);
      const id = newId.trim();
      if (problem || !useCase || id === useCase.id) {
        return problem;
      }

      // Move the children along, unless another use case still has the old ID (then they keep that parent).
      const oldId = useCase.id;
      const oldIdStillUsed = this.useCases.some(
        (other) => other !== useCase && other.domain === useCase.domain && other.id === oldId,
      );
      useCase.id = id;
      if (!oldIdStillUsed) {
        for (const child of this.useCasesWithParent(oldId, useCase.domain)) {
          child.parentIds = child.parentIds!.map((parentId) => (parentId === oldId ? id : parentId));
        }
      }
      this.recalculateAll();
      return null;
    },

    // Renames several use cases in one go, such as a selection that gets lettered IDs (THR-1-E, THR-1-F …): a new ID may
    // be the old ID of another one of them. Their children move along. Returns why it is refused (then nothing is
    // renamed), or null.
    renameUseCases(renames: { uid: string; id: string }[]): string | null {
      const uids = renames.map((rename) => rename.uid);
      const newIds = renames.map((rename) => rename.id.trim());
      for (const [index, rename] of renames.entries()) {
        const problem = this.renameProblem(rename.uid, rename.id, uids);
        if (problem) {
          return problem;
        }
        if (newIds.indexOf(newIds[index]!) !== index) {
          return `A use case with ID "${newIds[index]}" already exists in this domain. Choose another ID.`;
        }
      }

      // The children are found by the old IDs, before any of them changes.
      const useCases = uids.map((uid) => this.getUseCaseByUid(uid)!);
      const newIdOf = new Map(useCases.map((useCase, index) => [useCase.id, newIds[index]!]));
      const children = new Set(useCases.flatMap((useCase) => this.useCasesWithParent(useCase.id, useCase.domain)));
      useCases.forEach((useCase, index) => {
        useCase.id = newIds[index]!;
      });
      for (const child of children) {
        child.parentIds = child.parentIds!.map((parentId) => newIdOf.get(parentId) ?? parentId);
      }
      this.recalculateAll();
      return null;
    },

    removeAllUseCases() {
      this.useCases = [];
    },

    // Removes the use cases of the open sheet, apart from the permanent IN and THR.
    removeActiveTabUseCases(domain?: string) {
      this.removeUseCasesByUid(
        this.activeTabUseCases(domain)
          .filter((useCase) => !useCase.permanent)
          .map((useCase) => useCase.uid),
      );
    },

    removeL1UseCases(domain?: string) {
      this.L1UseCases(domain).forEach((useCase) => {
        if (!useCase.permanent) {
          this.removeUseCaseByUid(useCase.uid);
        }
      });
    },

    removeL2UseCases(domain?: string) {
      this.L2UseCases(domain).forEach((useCase) => {
        if (!useCase.permanent) {
          this.removeUseCaseByUid(useCase.uid);
        }
      });
    },

    removeL3UseCases(domain?: string) {
      this.L3UseCases(domain).forEach((useCase) => {
        if (!useCase.permanent) {
          this.removeUseCaseByUid(useCase.uid);
        }
      });
    },

    // Recalculate the derived values (weight, potential, L1/L2 averages and L1 risks) of all use cases in all domains,
    // children before parents (see domain/magma/calculations.ts). Recalculating everything after each change ensures
    // that no dependent value can stay outdated, for example a business risk after a change under cumulative IN.
    recalculateAll() {
      recalculateUseCases(this.useCases);
    },

    updateUseCase(uid: string, updatedFields: UpdatedFields, domain?: string) {
      const tactics = tacticsStore();
      const useCase = this.getUseCaseByUid(uid, domain);

      if (useCase) {
        // If the attackTechniqueId field was updated, do the following.
        if (updatedFields.attackTechniqueId) {
          // Set visibility based on the visibility ratio of the selected ATT&CK technique (if one is selected).
          if (updatedFields.attackTechniqueId === 'none') {
            useCase.visibilityFromAttackTechnique = false;
          } else {
            if (!useCase.visibilityFromAttackTechniqueOverride) {
              const attackTechniqueId = updatedFields.attackTechniqueId;
              useCase.visibility = formatPercentage(
                tactics.getDomainTechniqueVisibilityPercentageById(attackTechniqueId, domain ?? useCase.domain),
              );
            }
            useCase.visibilityFromAttackTechnique = true;
          }
        }

        // Update the use case.
        Object.assign(useCase, updatedFields);

        if (domain) {
          useCase.domain = domain;
        }

        // Recalculate the derived values; this also covers the old and new parents when the parents were changed.
        this.recalculateAll();
      }
    },

    // Update the L3 use cases visibility based on the dettect visibility value, and update the depending weight/potential values. Also update any parent use cases.
    updateAllL3UseCasesBasedOnDettectVisibility() {
      const tactics = tacticsStore();
      this.L3UseCases().forEach((useCase) => {
        if (
          useCase.visibilityFromAttackTechnique === true &&
          useCase.visibilityFromAttackTechniqueOverride === false &&
          useCase.attackTechniqueId
        ) {
          useCase.visibility = formatPercentage(
            tactics.getDomainTechniqueVisibilityPercentageById(useCase.attackTechniqueId, useCase.domain),
          );
        }
      });
      this.recalculateAll();
    },

    // Load the use cases of a MaGMa file (see readMagmaFile in io/magmaFile.ts): they replace the current use cases of the
    // domains in the file, and the other domains stay as they are.
    // When something unexpected goes wrong, the use cases stay as they were and the error is passed on, so the sheets
    // can show it (SheetTabs.vue).
    loadUseCases(useCases: UseCaseFromFile[]): ImportResult {
      const before = this.useCases;
      try {
        const domains = magmaFileDomains(useCases);
        this.useCases = this.useCases.filter((useCase) => useCase.permanent || !domains.includes(useCase.domain));
        const result = this.importUseCases(useCases);
        this.markAsSaved();
        this.sheetSorts = {}; // a loaded file is shown in its own order
        this.history = emptyHistory(); // a loaded file starts a new history
        return result;
      } catch (error) {
        this.useCases = before;
        this.recalculateAll();
        throw error;
      }
    },

    // Undo and redo (see undoHistory.ts). The sheets call recordStep before each change, with a description of it and, for
    // typing in a cell, the cell as group: the keystrokes in one cell make one step, until the cell is left (endStepGroup).
    // The step remembers the sheet and domain of the change; undo and redo show them, so the change can be seen.
    recordStep(description: string, group: string | null = null) {
      if (inOpenGroup(this.history, group)) {
        return;
      }
      const place: Place = { tab: this.activeTab, domain: tacticsStore().domain };
      this.history = recordStep(this.history, { state: JSON.stringify(this.useCases), description, place }, group);
    },

    endStepGroup() {
      this.history = endGroup(this.history);
    },

    undo() {
      const result = undoStep(this.history, JSON.stringify(this.useCases));
      if (result) {
        this.restoreStep(result);
      }
    },

    redo() {
      const result = redoStep(this.history, JSON.stringify(this.useCases));
      if (result) {
        this.restoreStep(result);
      }
    },

    // Puts back the use cases of an undone or redone step, with the visibility of their techniques from the DeTT&CT file
    // that is loaded now, recalculates, and shows the sheet and domain of the step.
    restoreStep({ step, history }: { step: Step<string>; history: History<string> }) {
      this.history = history;
      this.useCases = JSON.parse(step.state);
      this.updateAllL3UseCasesBasedOnDettectVisibility();
      this.activeTab = step.place.tab;
      tacticsStore().setDomain(step.place.domain);
    },

    // What the user entered, without what PRISMA calculates (such as a visibility taken from the DeTT&CT file, weights
    // and the values of L1 and L2), so that loading another DeTT&CT file does not count as an unsaved change.
    userInput() {
      return JSON.stringify(
        this.domainSortedUseCases
          .filter((useCase) => !useCase.permanent)
          .map((useCase) => {
            const visibilityEntered =
              useCase.level === 3 &&
              (!useCase.visibilityFromAttackTechnique || useCase.visibilityFromAttackTechniqueOverride);
            return {
              domain: useCase.domain,
              level: useCase.level,
              id: useCase.id,
              name: useCase.name,
              description: useCase.description,
              parentIds: useCase.parentIds,
              dataSource: useCase.dataSource,
              attackTechniqueId: useCase.attackTechniqueId,
              visibilityFromAttackTechniqueOverride: useCase.visibilityFromAttackTechniqueOverride,
              visibility: visibilityEntered ? exportNumber(useCase.visibility) : undefined,
              implementation: useCase.level === 3 ? exportNumber(useCase.implementation) : undefined,
              effectiveness: useCase.level === 3 ? exportNumber(useCase.effectiveness) : undefined,
              inImpact: exportNumber(useCase.inImpact),
              thrImpact: exportNumber(useCase.thrImpact),
              outImpact: exportNumber(useCase.outImpact),
            };
          }),
      );
    },

    // Remember what the user had entered at a load or save, so the page can warn before closing with unsaved changes.
    markAsSaved() {
      this.savedUseCases = this.userInput();
    },

    // Whether the user changed the use cases since the last load or save (or, before that, added any).
    hasUnsavedChanges() {
      return this.userInput() !== this.savedUseCases;
    },

    // Add use cases from a MaGMa file (see readMagmaFile in io/magmaFile.ts) to the current use cases. Use cases that cannot
    // be added are skipped; the result says why (see importSummary in io/magmaFile.ts).
    importUseCases(useCasesFromFile: UseCaseFromFile[]): ImportResult {
      // Each use case is checked when it is added (addExistingUseCase); until then, its fields are taken as they are.
      const useCases = useCasesFromFile as UseCase[];
      useCases.forEach(readAsMeant);
      const failed: string[] = [];
      let imported = 0;

      // Use cases that are their own (indirect) parent cannot be calculated, so they are not imported.
      const parentCycles = findParentCycles(useCases.filter((useCase) => !useCase.permanent));

      // Iterate over each use case and try to add it.
      useCases.forEach((useCase) => {
        // Skip permanent use cases, since they should always be present already for all 3 domains).
        if (useCase.permanent) {
          return;
        }
        try {
          const cycle = parentCycles.get(useCase);
          if (cycle) {
            throw new Error(
              `Use case "${useCase.id}" in domain "${useCase.domain}" is its own (indirect) parent: ${cycle.join(' → ')}.`,
            );
          }
          this.addExistingUseCase(useCase, false);
          imported++;
        } catch (error) {
          failed.push((error as Error).message);
        }
      });

      // Recalculate all use cases once, now that the whole file has been added.
      this.recalculateAll();

      // Use cases with a parent ID that does not exist, with a parent on the wrong level, or with more than one parent, are
      // imported, but listed as a warning (probably a typo, e.g. a comma in the parent column of the Excel file).
      const warnings = [
        ...findUnknownParents(this.useCases).map(
          ({ useCase, parentId }) =>
            `Use case "${useCase.id}" in domain "${useCase.domain}" has parent "${parentId}", which does not exist.`,
        ),
        ...findWrongLevelParents(this.useCases).map(({ useCase, parent }) =>
          useCase.level === 1
            ? `Use case "${useCase.id}" in domain "${useCase.domain}" has parent "${parent.id}", while a level 1 use case has no parent; it does not count for "${parent.id}".`
            : `Use case "${useCase.id}" in domain "${useCase.domain}" has parent "${parent.id}" on level ${parent.level}, while its parent should be on level ${useCase.level - 1}; it does not count for "${parent.id}".`,
        ),
        ...findMultipleParents(this.useCases.filter((useCase) => !useCase.permanent)).map(
          ({ useCase, parentIds }) =>
            `Use case "${useCase.id}" in domain "${useCase.domain}" has ${parentIds.length} parents (${parentIds.join(', ')}); PRISMA expects one parent per use case, and counts it under each of them.`,
        ),
      ];

      return { imported, failed, warnings };
    },

    // The permanent IN and THR use cases of every domain: the cumulative IN and THROUGH risk, which amplify the business
    // risks. Each has its own internal ID (uid), like every other use case; they are known by their ID (IN or THR).
    initializeDefaultUseCases() {
      if (this.useCases.length === 0) {
        const cumulative = (domain: string, id: 'IN' | 'THR', stages: string): UseCase => ({
          domain,
          level: 1,
          uid: uuidv4(),
          id,
          name: `Cumulative ${stages} risk`,
          description: `Cumulative risk of ${stages} stages and techniques, serving as a risk amplifier for the business risks.`,
          visibility: 0,
          implementation: 0,
          effectiveness: 0,
          weight: 0,
          potential: 100,
          permanent: true,
        });
        this.useCases = SUPPORTED_DOMAINS.flatMap((domain) => [
          cumulative(domain, 'IN', 'IN'),
          cumulative(domain, 'THR', 'THROUGH'),
        ]);
      }
    },
  },
});
