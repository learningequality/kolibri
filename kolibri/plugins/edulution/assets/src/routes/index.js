import store from 'kolibri.coreVue.vuex.store';
import { showKnowledgeMap } from '../modules/topicsTree/handlers';
import { PageNames } from '../constants';
import routes from '../../../../learn/assets/src/routes';

export default [
  ...routes,
  {
    name: PageNames.KNOWLEDGE_MAP,
    path: '/topics/km/:id',
    handler: toRoute => {
      showKnowledgeMap(store, toRoute.params.id);
    },
  },
];
