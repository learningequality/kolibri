import { SignUpResource } from 'kolibri.resources';

export function signUpNewUser(store, signUpCreds) {
  store.commit('SET_SIGN_UP_BUSY', true);
  store.commit('RESET_STATE');
  return SignUpResource.saveModel({ data: signUpCreds })
    .then(() => {
      store.commit('SET_SIGN_UP_ERROR', { errorCode: null });
      window.location = '/';
    })
    .catch(error => {
      const { status, entity } = error;
      let errorMessage = '';
      if (status.code === 400 || status.code === 200) {
        errorMessage = entity[0];
      }
      store.commit('SET_SIGN_UP_ERROR', {
        errorCode: status.code,
        errorMessage,
      });
      store.commit('SET_SIGN_UP_BUSY', false);
    });
}
