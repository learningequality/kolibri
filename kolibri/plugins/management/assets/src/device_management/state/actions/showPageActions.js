import * as getters from 'kolibri.coreVue.vuex.getters';
import * as coreActions from 'kolibri.coreVue.vuex.actions';
import { TaskResource } from 'kolibri.resources';

function _taskState(data) {
  return {
    id: data.id,
    type: data.type,
    status: data.status,
    metadata: data.metadata,
    percentage: data.percentage,
  };
}

export function showContentPage(store) {
  if (!getters.isSuperuser(store.state)) {
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    return;
  }

  const taskCollectionPromise = TaskResource.getCollection().fetch();
  taskCollectionPromise.only(
    coreActions.samePageCheckGenerator(store),
    taskList => {
      const pageState = {
        taskList: taskList.map(_taskState),
        wizardState: { shown: false },
        channelFileSummaries: {},
      };
      coreActions.setChannelInfo(store).then(() => {
        store.dispatch('SET_PAGE_STATE', pageState);
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      });
    },
    error => {
      coreActions.handleApiError(store, error);
    }
  );
}

export function showPermissionsPage(store) {
  store.dispatch('SET_PAGE_STATE', {
    permissionsJunk: true,
  })
}
