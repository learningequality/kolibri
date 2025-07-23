import pluginModule from '../src/modules/pluginModule';
import coreModule from '../../../../core/assets/src/state/modules/core';
import { coreStoreFactory } from 'kolibri/store';

export default function makeStore() {
  const store = coreStoreFactory(pluginModule);
  store.registerModule('core', coreModule);
  return store;
}
