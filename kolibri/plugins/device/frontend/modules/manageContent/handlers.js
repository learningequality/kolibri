import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';

export function showManageContentPage(store) {
  store.commit('manageContent/RESET_STATE');
  store.commit('manageContent/wizard/RESET_STATE');
  const { canManageContent } = useUser();
  if (get(canManageContent)) {
    return Promise.all([
      store.dispatch('manageContent/refreshTaskList'),
      store.dispatch('manageContent/refreshChannelList'),
    ]).then(() => {
      pageLoading.value = false;
    });
  }
  pageLoading.value = false;
  return Promise.resolve();
}
