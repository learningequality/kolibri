import { coreStoreFactory } from 'kolibri/store';
import pluginModule from '../src/modules/pluginModule';
import coreModule from '../../../../core/assets/src/state/modules/core';

export default function makeStore(options = {}) {
  const store = coreStoreFactory(pluginModule);
  store.registerModule('core', coreModule);
  if (options.pageName) {
    store.state.pageName = options.pageName;
  }
  return store;
}
