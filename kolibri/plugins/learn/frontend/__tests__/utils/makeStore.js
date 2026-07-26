import createStore from 'kolibri-common/utils/createStore';
import pluginModule from '../../modules/pluginModule';

export default function makeStore(options = {}) {
  const store = createStore(pluginModule);
  if (options.pageName) {
    store.state.pageName = options.pageName;
  }
  return store;
}
