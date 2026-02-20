import { coreStoreFactory } from 'kolibri/store';
import pluginModule from '../../modules/pluginModule';
import coreModule from '../../../../../core/frontend/state/modules/core';

export default function makeStore(options = {}) {
  const store = coreStoreFactory(pluginModule);
  store.registerModule('core', coreModule);
  if (options.pageName) {
    store.state.pageName = options.pageName;
  }
  return store;
}
