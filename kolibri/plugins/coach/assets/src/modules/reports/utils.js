import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { localeCompare } from 'kolibri.utils.i18n';
import { TableColumns, SortOrders } from '../../constants/reportConstants';

/* given an array of objects sum the keys on those that pass the filter */
function _sumOfKeys(array, key, filter = () => true) {
  return array.filter(filter).reduce((prev, item) => prev + item[key], 0);
}

export function countNodes(progressArray, filter) {
  return _sumOfKeys(progressArray, 'nodeCount', filter);
}

export function calcProgress(progressArray, filter, itemCount, userCount) {
  const totalProgress = _sumOfKeys(progressArray, 'totalProgress', filter);
  if (itemCount && userCount) {
    return totalProgress / (itemCount * userCount);
  }
  return undefined;
}

export function onlyExercises(item) {
  return item.kind === ContentNodeKinds.EXERCISE;
}

export function onlyContent(item) {
  return item.kind !== ContentNodeKinds.EXERCISE;
}

export function genCompareFunc(sortColumn, sortOrder) {
  const columnToKey = {
    [TableColumns.NAME]: 'title',
    [TableColumns.EXERCISE]: 'exerciseProgress',
    [TableColumns.CONTENT]: 'contentProgress',
    [TableColumns.DATE]: 'lastActive',
    [TableColumns.GROUP]: 'groupName',
  };
  const key = columnToKey[sortColumn];

  // take into account sort order
  const flipSortOrder = sortOrder === SortOrders.DESCENDING ? 1 : -1;
  // default order of names is A-Z; everything else goes high-low
  const flipNameCol = sortColumn !== TableColumns.NAME ? -1 : 1;
  // helper to choose correct order
  const flipped = direction => direction * flipSortOrder * flipNameCol;
  // generate and return the actual comparator function
  return (a, b) => {
    // make sure undefined values get sorted below defined values
    if (a[key] !== undefined && b[key] === undefined) {
      return flipped(1);
    }
    if (a[key] === undefined && b[key] !== undefined) {
      return flipped(-1);
    }
    // standard comparisons
    return localeCompare(a[key], b[key]);
  };
}
