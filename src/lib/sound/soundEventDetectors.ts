export function collectNewIds(params: {
  currentIds: readonly string[];
  knownIds: ReadonlySet<string>;
  hasInitialized: boolean;
}): string[] {
  const { currentIds, knownIds, hasInitialized } = params;
  if (!hasInitialized) return [];
  return currentIds.filter((id) => !knownIds.has(id));
}

export function markIdsKnown(ids: Iterable<string>, known: Set<string>): void {
  for (const id of ids) {
    known.add(id);
  }
}

export function initializeKnownIds(ids: Iterable<string>, known: Set<string>): void {
  markIdsKnown(ids, known);
}
