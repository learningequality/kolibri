import Lockr from 'lockr';
import { SIGNED_OUT_DUE_TO_INACTIVITY } from 'kolibri.coreVue.vuex.constants';
import { createTranslator } from 'kolibri.utils.i18n';
import { PageNames } from '../../constants';

const snackbarTranslator = createTranslator('UserPageSnackbars', {
  dismiss: 'Dismiss',
  signedOut: 'You were automatically signed out due to inactivity',
});

export function showSignInPage(store) {
  store.commit('SET_PAGE_NAME', PageNames.SIGN_IN);
  if (Lockr.get(SIGNED_OUT_DUE_TO_INACTIVITY)) {
    store.commit('CORE_CREATE_SNACKBAR', {
      text: snackbarTranslator.$tr('signedOut'),
      autoDismiss: false,
      actionText: snackbarTranslator.$tr('dismiss'),
      actionCallback: () => store.commit('CORE_CLEAR_SNACKBAR'),
    });
    Lockr.set(SIGNED_OUT_DUE_TO_INACTIVITY, null);
  }
  store.dispatch('setFacilitiesAndConfig').then(() => {
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
    store.dispatch('resetAndSetPageName', {
      pageName: PageNames.SIGN_IN,
    });
  });
}
