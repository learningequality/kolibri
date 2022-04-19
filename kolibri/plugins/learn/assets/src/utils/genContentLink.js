import { PageNames } from '../constants';

// previous context allows to pass in ids or params from the last route
// topic id is passed to account for variability in topic search
// and parent/ancestor id navigation
export default function genContentLink(
  id,
  topicId = null,
  isLeaf = false,
  last = null,
  prevContext = {}
) {
  const query = { ...prevContext };
  if (last) {
    query.last = last;
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
