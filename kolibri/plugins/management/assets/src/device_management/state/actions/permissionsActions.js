export function showPermissionsPage(store) {
  store.dispatch('SET_PAGE_STATE', {
    permissionsJunk: true,
  });
}
