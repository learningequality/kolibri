export function submitDefaultLanguage(store, language) {
  store.dispatch('SET_LANGUAGE', language);
}

export function submitFacilityName(store, facilityName) {
  store.dispatch('SET_FACILITY_NAME', facilityName);
}

export function submitSuperuserCredentials(store, { name, username, password }) {
  store.dispatch('SET_SU', {
    name,
    username,
    password,
  });
}
export function submitFacilityPermissions(store, facilityPreset) {
  store.dispatch('SET_FACILITY_PRESET', facilityPreset);
}
