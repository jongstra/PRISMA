// Validation of MaGMa use cases, for example when they are imported from a YAML file.

export interface UseCaseReference {
  domain: string;
  id: string;
  level?: number;
  parentIds?: unknown;
}

/** The parent IDs of a use case. 'none' is what the editor stores when "None" is selected as parent. */
function parentIdsOf(useCase: UseCaseReference): string[] {
  return Array.isArray(useCase.parentIds)
    ? useCase.parentIds.filter((id): id is string => typeof id === 'string' && id !== '' && id !== 'none')
    : [];
}

/**
 * Reads what is clearly meant in a use case from a file written by hand or by another script, in place: an ID written
 * as a number (id: 123) is text, a parent written as text or a number (parentIds: DOS-1) is a list of one, and an empty
 * parent is no parent. What is still not valid is refused when the use case is added (see idProblem and parentProblem).
 */
export function readAsMeant(useCase: { id?: unknown; parentIds?: unknown }): void {
  const asText = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? String(value) : value);
  if (typeof useCase.id === 'number') {
    useCase.id = asText(useCase.id);
  }
  const parents = useCase.parentIds;
  if (parents === null || parents === '') {
    delete useCase.parentIds;
  } else if (typeof parents === 'string' || typeof parents === 'number') {
    useCase.parentIds = [asText(parents)];
  } else if (Array.isArray(parents)) {
    useCase.parentIds = parents.map(asText);
  }
}

/** Why the ID of a use case from a file is not valid, or null when it is: an ID is text. */
export function idProblem(id: unknown): string | null {
  return typeof id === 'string' ? null : `The ID ${JSON.stringify(id)} is not valid: an ID is text, such as DOS-1.`;
}

/** Why the parent of a use case from a file is not valid, or null when it is: a list of IDs, or none. */
export function parentProblem(useCase: { id: string; parentIds?: unknown }): string | null {
  const parents = useCase.parentIds;
  const wrong = Array.isArray(parents) ? parents.find((parent) => typeof parent !== 'string') : parents;
  return wrong === undefined
    ? null
    : `The parent ${JSON.stringify(wrong)} of use case "${useCase.id}" is not valid: a parent is an ID, such as DOS-1.`;
}

/**
 * Checks a percentage (visibility, implementation, effectiveness, IN/THR/OUT impact). It may be empty, or a number from
 * 0 to 100, also when typed as text ("50"). Returns a description of the problem, or null when the value is valid.
 */
export function percentageProblem(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const number =
    typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    return 'it must be a number from 0 to 100';
  }
  return null;
}

/**
 * Finds the use cases that are their own parent, directly or via other use cases (A → B → A). Their values cannot be
 * calculated. Returns, per such use case, the path back to itself.
 */
export function findParentCycles<T extends UseCaseReference>(useCases: T[]): Map<T, string[]> {
  const key = (domain: string, id: string) => `${domain}|${id}`;
  const useCasesById = new Map<string, T[]>();
  for (const useCase of useCases) {
    const k = key(useCase.domain, useCase.id);
    if (!useCasesById.has(k)) {
      useCasesById.set(k, []);
    }
    useCasesById.get(k)!.push(useCase);
  }

  const cycles = new Map<T, string[]>();
  for (const start of useCases) {
    // Follow the parents from the start use case; reaching its own ID again means a cycle.
    const seen = new Set<T>();
    const stack: { useCase: T; path: string[] }[] = [{ useCase: start, path: [start.id] }];
    search: while (stack.length > 0) {
      const { useCase, path } = stack.pop()!;
      for (const parentId of parentIdsOf(useCase)) {
        if (parentId === start.id) {
          cycles.set(start, [...path, parentId]);
          break search;
        }
        for (const parent of useCasesById.get(key(start.domain, parentId)) ?? []) {
          if (!seen.has(parent)) {
            seen.add(parent);
            stack.push({ useCase: parent, path: [...path, parentId] });
          }
        }
      }
    }
  }
  return cycles;
}

/** Lists the parent IDs that do not exist in the use case's domain. */
export function findUnknownParents<T extends UseCaseReference>(useCases: T[]): { useCase: T; parentId: string }[] {
  const ids = new Set(useCases.map((useCase) => `${useCase.domain}|${useCase.id}`));
  return useCases.flatMap((useCase) =>
    parentIdsOf(useCase)
      .filter((parentId) => !ids.has(`${useCase.domain}|${parentId}`))
      .map((parentId) => ({ useCase, parentId })),
  );
}

/**
 * Lists the use cases with more than one parent. PRISMA expects one parent per use case (the MaGMa documentation splits
 * a detection rule into separate use cases instead); such a use case is counted under each of its parents.
 */
export function findMultipleParents<T extends UseCaseReference>(useCases: T[]): { useCase: T; parentIds: string[] }[] {
  return useCases
    .map((useCase) => ({ useCase, parentIds: parentIdsOf(useCase) }))
    .filter(({ parentIds }) => parentIds.length > 1);
}

/**
 * Lists the parents that are not on the level above the use case: an L3 use case directly under an L1, or an L1 use case
 * with a parent. Such a parent does not count the use case in its scores, as if the parent did not exist.
 */
export function findWrongLevelParents<T extends UseCaseReference>(useCases: T[]): { useCase: T; parent: T }[] {
  const byId = new Map<string, T[]>();
  for (const useCase of useCases) {
    const key = `${useCase.domain}|${useCase.id}`;
    byId.set(key, [...(byId.get(key) ?? []), useCase]);
  }
  return useCases.flatMap((useCase) =>
    parentIdsOf(useCase)
      .flatMap((parentId) => byId.get(`${useCase.domain}|${parentId}`) ?? [])
      .filter((parent) => parent.level !== (useCase.level ?? 0) - 1)
      .map((parent) => ({ useCase, parent })),
  );
}
