import { coreStoreFactory } from 'kolibri.coreVue.vuex.store';
import pluginModule from '../src/modules/pluginModule';
import coreModule from '../../../../core/assets/src/state/modules/core';

export default function makeStore(patch) {
  const store = coreStoreFactory({
    ...pluginModule,
    modules: {
      ...pluginModule.modules,
      ...patch,
    },
  });
  store.registerModule('core', coreModule);
  return store;
}
