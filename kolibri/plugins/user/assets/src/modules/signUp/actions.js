import { SignUpResource } from 'kolibri.resources';
import { redirectBrowser } from 'kolibri.utils.browser';
import CatchErrors from 'kolibri.utils.CatchErrors';
import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';

export function signUpNewUser(store, signUpCreds) {
  store.commit('SET_SIGN_UP_BUSY', true);
  store.commit('RESET_STATE');
  return SignUpResource.saveModel({ data: signUpCreds })
    .then(() => {
      redirectBrowser();
    })
    .catch(error => {
      const errors = CatchErrors(error, [
        ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS,
        ERROR_CONSTANTS.INVALID,
      ]);
      if (errors) {
        // We have recognized errors, set them on the errors state
        store.commit('SET_SIGN_UP_ERRORS', errors);
      } else {
        // No errors we recognize, flag there are unrecognized errors
        store.commit('SET_UNRECOGNIZED_ERROR');
      }
      store.commit('SET_SIGN_UP_BUSY', false);
    });
}
