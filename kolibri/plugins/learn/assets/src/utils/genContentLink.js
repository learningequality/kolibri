import { PageNames } from '../constants';

// previous context allows to pass in ids or params from the last route
// topic id is passed to account for variability in topic search
// and parent/ancestor id navigation
export default function genContentLink(
  id,
  topicId = null,
  isLeaf = false,
  last = null,
  prevContext = null
) {
  const query = {};
  if (last) {
    query.last = last;
  }
  if (prevContext) {
    query.prevContext = encodeURI(JSON.stringify(prevContext));
  }
  if (topicId) {
    query.topicId = topicId;
  }
  return {
    name: isLeaf ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC,
    params: { id },
    query,
  };
}

export function getBackRoute(route, defaultTopicId = null) {
  if (!route) {
    return null;
  }
  const query =
    route.query && route.query.prevContext ? JSON.parse(decodeURI(route.query.prevContext)) : {};
  let name = (route.query || {}).last || PageNames.HOME;
  const params = {};
  // returning to a topic page requires an id
  if (name === PageNames.TOPICS_TOPIC_SEARCH || name === PageNames.TOPICS_TOPIC) {
    const topicId = route.query.topicId ? route.query.topicId : defaultTopicId;
    if (topicId) {
      params.id = topicId;
    } else {
      name = PageNames.HOME;
    }
  }
  return {
    name,
    params,
    query,
  };
}
