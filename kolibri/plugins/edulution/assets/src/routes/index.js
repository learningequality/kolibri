import store from 'kolibri.coreVue.vuex.store';
import { showKnowledgeMap } from '../modules/topicsTree/handlers';
import { PageNames } from '../constants';
import routes from '../../../../learn/assets/src/routes';

export default [
  {
    name: PageNames.KNOWLEDGE_MAP,
    path: '/topics/t/:id',
    handler: toRoute => {
      showKnowledgeMap(store, toRoute.params.id);
    },
  },
  ...routes,
];
