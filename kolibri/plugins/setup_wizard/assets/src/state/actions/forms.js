export function submitDefaultLanguage(store, language) {
  store.commit('SET_LANGUAGE', language);
}

export function submitFacilityName(store, facilityName) {
  store.commit('SET_FACILITY_NAME', facilityName);
}

export function submitSuperuserCredentials(store, { name, username, password }) {
  store.commit('SET_SU', {
    name,
    username,
    password,
  });
}
export function submitFacilityPermissions(store, facilityPreset) {
  store.commit('SET_FACILITY_PRESET', facilityPreset);
}
