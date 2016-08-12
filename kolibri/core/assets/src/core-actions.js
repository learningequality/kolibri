function kolibriLogin(store, Kolibri, sessionPayload) {
  const SessionResource = Kolibri.resources.SessionResource;
  const sessionModel = SessionResource.createModel(sessionPayload);
  const sessionPromise = sessionModel.save(sessionPayload);
  const UserKinds = require('core-constants').UserKinds;
  sessionPromise.then((session) => {
    store.dispatch('CORE_SET_SESSION', session);
    /* Very hacky solution to redirect an admin or superuser to Manage tab on login*/
    if (session.kind[0] === UserKinds.SUPERUSER || session.kind[0] === UserKinds.ADMIN) {
      const manageURL = Kolibri.urls['kolibri:managementplugin:management']();
      window.location.href = window.location.origin + manageURL;
    } else {
      Kolibri.emit('refresh');
    }
    Kolibri.resources.clearCaches();
  }).catch((error) => {
    // hack to handle invalid credentials
    if (error.status.code === 401) {
      store.dispatch('CORE_HANDLE_WRONG_CREDS', { kind: 'ANONYMOUS', error: '401' });
    } else {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
    }
  });
}

function kolibriLogout(store, Kolibri) {
  const SessionResource = Kolibri.resources.SessionResource;
  const id = 'current';
  const sessionModel = SessionResource.getModel(id);
  const logoutPromise = sessionModel.delete();
  logoutPromise.then((response) => {
    store.dispatch('CORE_CLEAR_SESSION');
    /* Very hacky solution to redirect a user back to Learn tab on logout*/
    window.location.href = window.location.origin;
    Kolibri.resources.clearCaches();
  }).catch((error) => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

function currentLoggedInUser(store, Kolibri) {
  const SessionResource = Kolibri.resources.SessionResource;
  const id = 'current';
  const sessionModel = SessionResource.getModel(id);
  const sessionPromise = sessionModel.fetch();
  sessionPromise.then((session) => {
    store.dispatch('CORE_SET_SESSION', session);
  }).catch((error) => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

function togglemodal(store, bool) {
  store.dispatch('CORE_SET_MODAL_STATE', bool);
  if (!bool) {
    // Clears the store to clear any error message from login modal
    store.dispatch('CORE_CLEAR_SESSION');
  }
}

module.exports = {
  kolibriLogin,
  kolibriLogout,
  currentLoggedInUser,
  togglemodal,
};
