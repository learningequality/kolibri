function submitDefaultLanguage(store, language) {
  store.dispatch('SET_LANGUAGE', language);
}
function submitFacilityName(store, facilityName) {
  store.dispatch('SET_FACILITY_NAME', facilityName);
}
function submitSuperuserCredentials(store, name, username, password) {
  store.dispatch('SET_SU', {
    name,
    username,
    password,
  });
}
function submitFacilityPermissions(store, facilityPreset) {
  store.dispatch('SET_FACILITY_PRESET', facilityPreset);
}

export {
  submitDefaultLanguage,
  submitFacilityName,
  submitSuperuserCredentials,
  submitFacilityPermissions,
};
