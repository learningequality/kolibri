import { coreStoreFactory } from 'kolibri.coreVue.vuex.store';
import pluginModule from '../../src/modules/pluginModule';

export default function makeStore() {
  return coreStoreFactory(pluginModule);
}
