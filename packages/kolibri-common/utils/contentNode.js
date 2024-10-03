import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';
import { MasteryModelTypes } from 'kolibri.coreVue.vuex.constants';
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

export function masteryModelValidator({ type, m, n }) {
  let isValid = true;
  const typeIsValid = Object.values(MasteryModelTypes).includes(type);
  if (!typeIsValid) {
    // eslint-disable-next-line no-console
    console.error(`Invalid mastery model type: ${type}`);
    isValid = false;
  }
  if (type === MasteryModelTypes.m_of_n) {
    if (typeof n !== 'number' || typeof m !== 'number') {
      // eslint-disable-next-line no-console
      console.error(`Invalid value of m and/or n. m: ${m}, n: ${n}`);
      isValid = false;
    }
  }
  return isValid;
}
