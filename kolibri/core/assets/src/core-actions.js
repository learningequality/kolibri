function kolibriLogin(store, Kolibri, sessionPayload) {
  const SessionResource = Kolibri.resources.SessionResource;
  const sessionModel = SessionResource.createModel(sessionPayload);
  const sessionPromise = sessionModel.save(sessionPayload);
  sessionPromise.then((session) => {
    store.dispatch('CORE_SET_SESSION', session);
  }).catch((error) => {
    // hack to handle invalid credentials
    if (error.status.code === 401) {
      store.dispatch('CORE_SET_SESSION', { kind: 'ANONYMOUS', error: '401' });
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

module.exports = {
  kolibriLogin,
  kolibriLogout,
  currentLoggedInUser,
};
