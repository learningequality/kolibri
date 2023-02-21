import { get } from '@vueuse/core';
import router from 'kolibri.coreVue.router';
import useChannels from '../../composables/useChannels';
import { PageNames, pageNameToModuleMap } from '../../constants';

const { channels } = useChannels();

export function resetModuleState(store, lastPageName) {
  const moduleName = pageNameToModuleMap[lastPageName];
  if (moduleName) {
    store.commit(`${moduleName}/RESET_STATE`);
  }
}

export function setAndCheckChannels() {
  if (!get(channels).length) {
    router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
  }
  return get(channels);
}
