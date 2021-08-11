import Lockr from 'lockr';
import { SIGNED_OUT_DUE_TO_INACTIVITY } from 'kolibri.coreVue.vuex.constants';
import { createTranslator } from 'kolibri.utils.i18n';

const snackbarTranslator = createTranslator('UserPageSnackbars', {
  dismiss: {
    message: 'Dismiss',
    context:
      'Button which upon selecting will hide the notification that has appeared on the screen at that moment.',
  },
  signedOut: {
    message: 'You were automatically signed out due to inactivity',
    context:
      'Kolibri will automatically sign out users if they are inactive after a certain period of time. This is the message the user sees when they are signed out.',
  },
});

export function showSignInPage(store) {
  if (Lockr.get(SIGNED_OUT_DUE_TO_INACTIVITY)) {
    store.commit('CORE_CREATE_SNACKBAR', {
      text: snackbarTranslator.$tr('signedOut'),
      autoDismiss: false,
      actionText: snackbarTranslator.$tr('dismiss'),
      actionCallback: () => store.commit('CORE_CLEAR_SNACKBAR'),
    });
    Lockr.set(SIGNED_OUT_DUE_TO_INACTIVITY, null);
  }
  return store.dispatch('setFacilitiesAndConfig').then(() => {
    // Use selected id if available, otherwise get the default facility id from session
    let facilityId;
    if (store.getters.facilities.length > 1) {
      facilityId = store.state.facilityId || store.getters.currentFacilityId;
    } else {
      facilityId = store.getters.currentFacilityId;
    }
    store.commit('SET_FACILITY_ID', facilityId);
    store.commit('signIn/SET_STATE', {
      hasMultipleFacilities: store.getters.facilities.length > 1,
    });
  });
}
