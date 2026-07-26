import createStore from 'kolibri-common/utils/createStore';
import pluginModule from '../../modules/pluginModule';

export default function makeStore() {
  return createStore(pluginModule);
}
