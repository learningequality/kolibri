import { PageNames } from '../constants';

export default function genContentLink(id, isLeaf) {
  return {
    name: isLeaf ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC,
    params: { id },
  };
}
