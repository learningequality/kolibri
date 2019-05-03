import { Resource } from 'kolibri.lib.apiResource';

export const KnowledgeMapResource = new Resource({
  name: 'knowledgemap',
  namespace: 'edulutionplugin',

  fetchKnowdledgeMap(id) {
    return this.fetchModel({ id, force: true });
  },
});
