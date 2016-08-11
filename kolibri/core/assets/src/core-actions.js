function kolibriLogin(store, Kolibri, sessionPayload) {
  const SessionResource = Kolibri.resources.SessionResource;
  const sessionModel = SessionResource.createModel(sessionPayload);
  const sessionPromise = sessionModel.save(sessionPayload);
  sessionPromise.then((session) => {
    store.dispatch('CORE_SET_SESSION', session);
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
  const logoutPromise = sessionModel.delete(id);
  logoutPromise.then((response) => {
    store.dispatch('CORE_CLEAR_SESSION');
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
