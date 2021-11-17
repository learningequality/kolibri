import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';
import { currentLanguage } from 'kolibri.utils.i18n';

export function deduplicateResources(contentNodes) {
  const grouped = groupBy(contentNodes, 'content_id');
  return Object.keys(grouped).map(key => {
    const groupedNodes = grouped[key];
    if (groupedNodes.length === 1) {
      return groupedNodes[0];
    }
    const langCode = currentLanguage.split('-')[0];
    const sortedNodes = sortBy(groupedNodes, n => {
      if (n.lang && n.lang.id === currentLanguage) {
        // Best language match return 0 to sort first
        return 0;
      }
      if (n.lang && n.lang.lang_code === langCode) {
        // lang_code match, so next best
        return 1;
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
