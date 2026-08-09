/** Local offline split ids are negative (−1, −2, …); server ids are positive. */
export function hasAssignedSplitId(id: number | null | undefined): boolean {
  return typeof id === "number" && Number.isFinite(id) && id !== 0;
}
