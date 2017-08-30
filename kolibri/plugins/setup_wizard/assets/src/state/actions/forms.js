function submitDefaultLanguage(store, language) {
  store.dispatch('SET_LANGUAGE', language);
}
function submitFacilityName(store, facilityName) {
  store.dispatch('SET_FACILITY_NAME', facilityName);
}
function submitSuperuserCredentials(store, superUserCredentials) {
  store.dispatch('SET_SU_NAME', superUserCredentials.name);
  store.dispatch('SET_SU_USERNAME', superUserCredentials.username);
  store.dispatch('SET_SU_PASSWORD', superuserCredentials.password);
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
