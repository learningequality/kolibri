import { coreStoreFactory } from 'kolibri.coreVue.vuex.store';
import pluginModule from '../src/modules/pluginModule';

export default function makeStore(options = {}) {
  const store = coreStoreFactory(pluginModule);
  if (options.pageName) {
    store.state.pageName = options.pageName;
  }
  return store;
}
