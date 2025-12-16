import { coreStoreFactory } from 'kolibri/store';
import pluginModule from '../../modules/pluginModule';
import coreModule from '../../../../../core/frontend/state/modules/core';

export default function makeStore() {
  const store = coreStoreFactory(pluginModule);
  store.registerModule('core', coreModule);
  return store;
}
