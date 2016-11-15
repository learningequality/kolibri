
const Constants = require('./constants');
const logging = require('kolibri.lib.logging');

/* given an array of objects sum the keys on those that pass the filter */
function sumOfKeys(array, key, filter = () => true) {
  return array
    .filter(filter)
    .reduce((prev, item) => prev + item[key], 0);
}

function countNodes(progressArray, filter) {
  return sumOfKeys(progressArray, 'node_count', filter);
}

function calcProgress(progressArray, filter, count) {
  const totalProgress = sumOfKeys(progressArray, 'total_progress', filter);
  if (count) {
    return totalProgress / count;
  }
  return undefined;
}

function onlyExercises(item) {
  return item.kind === 'exercise';
}

function onlyContent(item) {
  return item.kind !== 'exercise';
}

function genCompareFunc(sortColumn, sortOrder) {
  const columnToKey = {};
  columnToKey[Constants.TableColumns.NAME] = 'title';
  columnToKey[Constants.TableColumns.EXERCISE] = 'exerciseProgress';
  columnToKey[Constants.TableColumns.CONTENT] = 'contentProgress';
  columnToKey[Constants.TableColumns.DATE] = 'lastActive';
  const key = columnToKey[sortColumn];

  // take into account sort order
  const flipOrder = sortOrder === Constants.SortOrders.DESCENDING ? 1 : -1;
  // default order of names is A-Z; everything else goes high-low
  const flipNameCol = sortColumn !== Constants.TableColumns.NAME ? -1 : 1;
  return (a, b) => {
    if (a[key] > b[key]) { return 1 * flipOrder * flipNameCol; }
    if (a[key] < b[key]) { return -1 * flipOrder * flipNameCol; }
    return 0;
  };
}

const getters = {
  exerciseCount(state) {
    return countNodes(state.pageState.content_scope_summary.progress, onlyExercises);
  },
  exerciseProgress(state) {
    return calcProgress(
      state.pageState.content_scope_summary.progress,
      onlyExercises,
      getters.exerciseCount(state)
    );
  },
  contentCount(state) {
    return countNodes(state.pageState.content_scope_summary.progress, onlyContent);
  },
  contentProgress(state) {
    return calcProgress(
      state.pageState.content_scope_summary.progress,
      onlyContent,
      getters.contentCount(state)
    );
  },
  dataTable(state) {
    let data = [];

    // CONTENT or LEARNERS
    if (state.pageState.view_by_content_or_learners === Constants.ViewBy.CONTENT) {
      data = state.pageState.table_data.map(item => ({
        kind: item.kind,
        id: item.pk,
        lastActive: item.last_active ? new Date(item.last_active) : null,
        title: item.title,
        parent: { id: item.parent.pk, title: item.parent.title },
        exerciseProgress: calcProgress(item.progress, onlyExercises, getters.exerciseCount(state)),
        contentProgress: calcProgress(item.progress, onlyContent, getters.contentCount(state)),
      }));
    } else if (state.pageState.view_by_content_or_learners === Constants.ViewBy.LEARNERS) {
      data = state.pageState.table_data.map(item => ({
        kind: 'user',
        id: item.pk.toString(), // see https://github.com/learningequality/kolibri/issues/657
        lastActive: item.last_active ? new Date(item.last_active) : null,
        title: item.full_name,
        exerciseProgress: calcProgress(item.details, onlyExercises, getters.exerciseCount(state)),
        contentProgress: calcProgress(item.details, onlyContent, getters.contentCount(state)),
      }));
    } else {
      logging.error('Unknown view-by state', state.pageState.view_by_content_or_learners);
    }

    // SORTING
    if (state.pageState.sort_order !== Constants.SortOrders.NONE) {
      data.sort(genCompareFunc(state.pageState.sort_column, state.pageState.sort_order));
    }

    return data;
  },
};


module.exports = getters;
