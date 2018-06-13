import Vue from 'kolibri.lib.vue';

// TODO move more mutations here so they can be tested
export function SET_PAGE_NAME(state, name) {
  state.pageName = name;
}
export function SET_PAGE_STATE(state, pageState) {
  state.pageState = pageState;
}
// modal mutations
export function SET_MODAL(state, modalName) {
  state.pageState.modalShown = modalName;
}

// class mutations
export function ADD_CLASS(state, classModel) {
  state.pageState.classes.push(classModel);
}

export function UPDATE_CLASS(state, id, updatedClass) {
  state.pageState.classes.forEach((classModel, index, arr) => {
    if (classModel.id === id) {
      arr[index] = updatedClass;
    }
  });
}

export function DELETE_CLASS(state, id) {
  state.pageState.classes = state.pageState.classes.filter(classModel => classModel.id !== id);
}

export function DELETE_CLASS_LEARNER(state, id) {
  state.pageState.classLearners = state.pageState.classLearners.filter(user => user.id !== id);
}
export function DELETE_CLASS_COACH(state, id) {
  state.pageState.classCoaches = state.pageState.classCoaches.filter(user => user.id !== id);
}

// user mutations
export function ADD_USER(state, user) {
  state.pageState.facilityUsers.push(user);
}

// TODO to be removed
export function SET_USER_JUST_CREATED(state, user) {
  state.pageState.userJustCreated = user;
}

export function UPDATE_USER(state, updatedUser) {
  const match = state.pageState.facilityUsers.find(user => user.id === updatedUser.id);
  Vue.set(match, 'username', updatedUser.username);
  Vue.set(match, 'full_name', updatedUser.full_name);
  Vue.set(match, 'kind', updatedUser.kind);
  Vue.set(match, 'roles', [...updatedUser.roles]);
}

export function SET_ERROR(state, error) {
  state.pageState.error = error;
}

export function SET_BUSY(state, isBusy) {
  state.pageState.isBusy = isBusy;
}

export function DELETE_USER(state, id) {
  state.pageState.facilityUsers = state.pageState.facilityUsers.filter(user => user.id !== id);
}

export function UPDATE_CURRENT_USER_KIND(state, newKind) {
  state.core.session.kind = newKind;
}
export function CONFIG_PAGE_NOTIFY(state, notificationType) {
  state.pageState.notification = notificationType;
}

export function CONFIG_PAGE_UNDO_SETTINGS_CHANGE(state) {
  state.pageState.settings = Object.assign({}, state.pageState.settingsCopy);
}

export function CONFIG_PAGE_MODIFY_SETTING(state, { name, value }) {
  if (state.pageState.settings[name] !== undefined) {
    state.pageState.settings[name] = value;
  }
}

export function CONFIG_PAGE_MODIFY_ALL_SETTINGS(state, settings) {
  state.pageState.settings = Object.assign({}, settings);
}

// this is basically the inverse of undo settings...
export function CONFIG_PAGE_COPY_SETTINGS(state) {
  state.pageState.settingsCopy = Object.assign({}, state.pageState.settings);
}
