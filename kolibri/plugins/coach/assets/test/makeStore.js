import { coreStoreFactory } from 'kolibri.coreVue.vuex.store';
import pluginModule from '../src/modules/pluginModule';

export default function makeStore(patch) {
  return coreStoreFactory({
    ...pluginModule,
    modules: {
      ...pluginModule.modules,
      ...patch,
    },
  });
}
