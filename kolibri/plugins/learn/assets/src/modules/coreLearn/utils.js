import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';

export function contentState(node, next_content = []) {
  if (!node) return null;
  return {
    next_content,
    ...node,
    ...assessmentMetaDataState(node),
  };
}

export function _collectionState(data) {
  return data.map(item => (item.kind === ContentNodeKinds.TOPICS ? item : contentState(item)));
}
