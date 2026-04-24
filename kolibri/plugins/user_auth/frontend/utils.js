import Lockr from 'lockr';
import router from 'kolibri/router';
import { SIGNED_OUT_DUE_TO_INACTIVITY } from 'kolibri/constants';
import { createTranslator } from 'kolibri/utils/i18n';
import useSnackbar from 'kolibri/composables/useSnackbar';
import { ComponentMap } from './constants';

const snackbarTranslator = createTranslator('UserPageSnackbars', {
  dismiss: {
    message: 'Close',
    context:
      'Button which upon selecting will hide the notification that has appeared on the screen at that moment.',
  },
  signedOut: {
    message: 'You were automatically signed out due to inactivity',
    context:
      'Kolibri will automatically sign out users if they are inactive after a certain period of time. This is the message the user sees when they are signed out.',
  },
});

export async function showInactivitySnackbar() {
  if (Lockr.get(SIGNED_OUT_DUE_TO_INACTIVITY)) {
    const { createSnackbar, clearSnackbar } = useSnackbar();
    createSnackbar({
      text: snackbarTranslator.$tr('signedOut'),
      autoDismiss: false,
      actionText: snackbarTranslator.$tr('dismiss'),
      actionCallback: () => clearSnackbar(),
    });
    Lockr.set(SIGNED_OUT_DUE_TO_INACTIVITY, null);
  }
}

/**
 * @param {String} nextRouteName The name route of where to go after facility selection
 * @param {Object} extra Extra route parameters
 * @return {*&{params: {whereToNext: *}}}
 */
export function getFacilitySelectionRoute(nextRouteName, extra = {}) {
  return {
    ...router.getRoute(ComponentMap.FACILITY_SELECT),
    // set `whereToNext` param, see FACILITY_SELECT route
    params: { whereToNext: router.getRoute(nextRouteName) },
    ...extra,
  };
}
