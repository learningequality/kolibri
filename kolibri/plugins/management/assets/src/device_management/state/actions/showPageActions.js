export function showContentPage(store) {
  store.dispatch('SET_PAGE_STATE', {
    contentJunk: true,
  })
}

export function showPermissionsPage(store) {
  store.dispatch('SET_PAGE_STATE', {
    permissionsJunk: true,
  })
}
