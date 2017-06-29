import * as ReportConstants from '../../reportConstants';
import * as CoreConstants from 'kolibri.coreVue.vuex.constants';

const ContentNodeKinds = CoreConstants.ContentNodeKinds;

/* given an array of objects sum the keys on those that pass the filter */
function _sumOfKeys(array, key, filter = () => true) {
  return array.filter(filter).reduce((prev, item) => prev + item[key], 0);
}

function countNodes(progressArray, filter) {
  return _sumOfKeys(progressArray, 'nodeCount', filter);
}

function calcProgress(progressArray, filter, itemCount, userCount) {
  const totalProgress = _sumOfKeys(progressArray, 'totalProgress', filter);
  if (itemCount && userCount) {
    return totalProgress / (itemCount * userCount);
  }
  return undefined;
}

function onlyExercises(item) {
  return item.kind === ContentNodeKinds.EXERCISE;
}

function onlyContent(item) {
  return item.kind !== ContentNodeKinds.EXERCISE;
}

function genCompareFunc(sortColumn, sortOrder) {
  const columnToKey = {};
  columnToKey[ReportConstants.TableColumns.NAME] = 'title';
  columnToKey[ReportConstants.TableColumns.EXERCISE] = 'exerciseProgress';
  columnToKey[ReportConstants.TableColumns.CONTENT] = 'contentProgress';
  columnToKey[ReportConstants.TableColumns.DATE] = 'lastActive';
  columnToKey[ReportConstants.TableColumns.GROUP] = 'groupName';
  const key = columnToKey[sortColumn];

  // take into account sort order
  const flipSortOrder = sortOrder === ReportConstants.SortOrders.DESCENDING ? 1 : -1;
  // default order of names is A-Z; everything else goes high-low
  const flipNameCol = sortColumn !== ReportConstants.TableColumns.NAME ? -1 : 1;
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
    if (a[key] > b[key]) {
      return flipped(1);
    }
    if (a[key] < b[key]) {
      return flipped(-1);
    }
    // they must be equal
    return 0;
  };
}

export { calcProgress, genCompareFunc, onlyContent, onlyExercises, countNodes };
