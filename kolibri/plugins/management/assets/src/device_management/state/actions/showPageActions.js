import * as getters from 'kolibri.coreVue.vuex.getters';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import { fetchCurrentTasks } from './taskActions';

export function showContentPage(store) {
  if (!getters.isSuperuser(store.state)) {
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    return;
  }

  return fetchCurrentTasks(store)
    .then(function onSuccess(taskList) {
      store.dispatch('SET_CONTENT_PAGE_STATE', {
        taskList,
        wizardState: { shown: false },
        channelFileSummaries: {},
      });
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(function onFailure(error) {
      handleApiError(store, error);
    });
}

export function showPermissionsPage(store) {
  store.dispatch('SET_PAGE_STATE', {
    permissionsJunk: true,
  });
}
