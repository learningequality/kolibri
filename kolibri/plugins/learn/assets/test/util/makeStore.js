import { coreStoreFactory } from 'kolibri.coreVue.vuex.store';
import pluginModule from '../../src/state/pluginModule';

export default function makeStore() {
  return coreStoreFactory(pluginModule);
}
