import store from 'kolibri.coreVue.vuex.store';
import { showKnowledgeMap } from '../modules/topicsTree/handlers';
import { PageNames } from '../constants';
import routes from '../../../../learn/assets/src/routes';
import { showChannels } from '../modules/topicsRoot/handlers';

export default [
  {
    name: PageNames.KNOWLEDGE_MAP,
    path: '/topics/t/:id',
    handler: toRoute => {
      showKnowledgeMap(store, toRoute.params.id);
    },
  },
  {
    name: PageNames.EDULUTION_TOPICS_ROOT,
    path: '/topics',
    handler: () => {
      showChannels(store);
    },
  },
  ...routes,
];
