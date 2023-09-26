export function canAccessUnassignedContent(state, getters) {
  return (
    state.canAccessUnassignedContentSetting ||
    getters.isCoach ||
    getters.isAdmin ||
    getters.isSuperUser
  );
}

export function allowGuestAccess(state) {
  return state.allowGuestAccess;
}
