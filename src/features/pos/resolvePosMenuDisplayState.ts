/** Shared POS menu UI gating — online fetch must not hide offline bootstrap menu. */
export function resolvePosMenuDisplayState(input: {
  isOfflineMode: boolean;
  offlineMenuCount: number;
  menuLoading: boolean;
  menuError: boolean;
}): {
  hasOfflineMenu: boolean;
  showMenuLoading: boolean;
  showMenuError: boolean;
} {
  const hasOfflineMenu = input.isOfflineMode && input.offlineMenuCount > 0;
  return {
    hasOfflineMenu,
    showMenuLoading: input.menuLoading && !hasOfflineMenu,
    showMenuError: input.menuError && !hasOfflineMenu,
  };
}
