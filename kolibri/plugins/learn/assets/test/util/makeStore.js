import { coreStoreFactory } from 'kolibri/store';
import pluginModule from '../../src/modules/pluginModule';
import coreModule from '../../../../../core/assets/src/state/modules/core';

export default function makeStore() {
  const store = coreStoreFactory(pluginModule);
  store.registerModule('core', coreModule);
  return store;
}
