import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';
import { getContentLangActive } from 'kolibri.utils.i18n';

export function deduplicateResources(contentNodes) {
  const grouped = groupBy(contentNodes, 'content_id');
  return Object.keys(grouped).map(key => {
    const groupedNodes = grouped[key];
    if (groupedNodes.length === 1) {
      return groupedNodes[0];
    }
    const sortedNodes = sortBy(groupedNodes, n => {
      if (n.lang) {
        const langActiveScore = getContentLangActive(n.lang);
        if (langActiveScore == 2) {
          // Best possible match return 0 to sort first
          return 0;
        }
        if (langActiveScore == 1) {
          // lang_code match, so next best
          return 1;
        }
      }
      // Everything else
      return 2;
    });
    const primaryNode = sortedNodes[0];
    // Include self in copies
    primaryNode.copies = sortedNodes;
    return primaryNode;
  });
}
