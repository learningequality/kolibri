export function showFacilityConfigPage(store) {
  // Component now handles its own data loading via useFacilityConfig composable
  // Just ensure the page loading state is cleared
  store.dispatch('preparePage');
  store.dispatch('notLoading');
}
