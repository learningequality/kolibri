import pluginModule from '../../../../learn/assets/src/modules/pluginModule';
import * as getters from './coreLearn/getters';
import topicsTree from './topicsTree';

export default {
  ...pluginModule,
  getters,
  modules: {
    ...pluginModule.modules,
    topicsTree,
  },
};
