import omit from 'lodash/fp/omit';
import { cachedTopicPath, nodesForTransfer } from '../getters';

export function ADD_NODE_TO_INCLUDE_LIST(state, node) {
  nodesForTransfer(state).included.push(node);
}

export function REMOVE_NODE_FROM_INCLUDE_LIST(state, node) {
  const newList = nodesForTransfer(state).included.filter(n => n.pk !== node.pk);
  nodesForTransfer(state).included = newList;
}

export function REPLACE_INCLUDE_LIST(state, newList) {
  nodesForTransfer(state).included = newList;
}

export function ADD_NODE_TO_OMIT_LIST(state, node) {
  nodesForTransfer(state).omitted.push(node);
}

export function REMOVE_NODE_FROM_OMIT_LIST(state, node) {
  const newList = nodesForTransfer(state).omitted.filter(n => n.pk !== node.pk);
  nodesForTransfer(state).omitted = newList;
}

export function REPLACE_OMIT_LIST(state, newList) {
  nodesForTransfer(state).omitted = newList;
}

export function SET_TREEVIEW_CURRENTNODE(state, payload) {
  state.pageState.wizardState.treeView.currentNode = payload;
}

export function SET_CURRENT_TOPIC_NODE(state, currentTopicNode) {
  state.pageState.wizardState.currentTopicNode = currentTopicNode;
}

export function ADD_PATH_TO_CACHE(state, { node, path }) {
  state.pageState.wizardState.pathCache[node.pk] = path;
}

export function UPDATE_PATH_BREADCRUMBS(state, topic) {
  const omitPath = omit('path');
  const cached = cachedTopicPath(state)(topic.pk);
  if (cached) {
    state.pageState.wizardState.path = cached;
  } else {
    let newCachedPath;
    // This only happens in showSelectChannel page when hydrating with channel node
    if (!topic.path) {
      newCachedPath = [omitPath(topic)];
    } else {
      // Every time else, path should be annotated by UI
      newCachedPath = topic.path.map(omitPath);
    }
    ADD_PATH_TO_CACHE(state, { node: topic, path: newCachedPath });
    UPDATE_PATH_BREADCRUMBS(state, topic);
  }
}

export function SET_AVAILABLE_SPACE(state, space) {
  state.pageState.wizardState.availableSpace = space;
}
