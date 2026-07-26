import createStore from 'kolibri-common/utils/createStore';
import pluginModule from '../../modules/pluginModule';

export default function makeStore(patch) {
  return createStore({
    ...pluginModule,
    modules: {
      ...pluginModule.modules,
      ...patch,
    },
  });
}
