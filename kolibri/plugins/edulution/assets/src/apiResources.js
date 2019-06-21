import { Resource } from 'kolibri.lib.apiResource';

export const KnowledgeMapResource = new Resource({
  name: 'knowledgemap',
  namespace: 'learnplugin',

  fetchKnowledgeMap(id) {
    return this.fetchModel({ id, force: true });
  },
});
