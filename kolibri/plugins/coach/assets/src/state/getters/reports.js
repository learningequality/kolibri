const ReportConstants = require('../../reportConstants');
const CoreConstants = require('kolibri.coreVue.vuex.constants');
const logging = require('kolibri.lib.logging');

const ContentNodeKinds = CoreConstants.ContentNodeKinds;


// Object to be exported by this module.
const getters = {};


/* given an array of objects sum the keys on those that pass the filter */
function _sumOfKeys(array, key, filter = () => true) {
  return array
    .filter(filter)
    .reduce((prev, item) => prev + item[key], 0);
}

function _countNodes(progressArray, filter) {
  return _sumOfKeys(progressArray, 'node_count', filter);
}

function calcProgress(progressArray, filter, itemCount, userCount) {
  const totalProgress = _sumOfKeys(progressArray, 'total_progress', filter);
  if (itemCount && userCount) {
    return totalProgress / (itemCount * userCount);
  }
  return undefined;
}

function _onlyExercises(item) {
  return item.kind === ContentNodeKinds.EXERCISE;
}

function _onlyContent(item) {
  return item.kind !== ContentNodeKinds.EXERCISE;
}

function _genCompareFunc(sortColumn, sortOrder) {
  const columnToKey = {};
  columnToKey[ReportConstants.TableColumns.NAME] = 'title';
  columnToKey[ReportConstants.TableColumns.EXERCISE] = 'exerciseProgress';
  columnToKey[ReportConstants.TableColumns.CONTENT] = 'contentProgress';
  columnToKey[ReportConstants.TableColumns.DATE] = 'lastActive';
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
    if (a[key] !== undefined && b[key] === undefined) { return flipped(1); }
    if (a[key] === undefined && b[key] !== undefined) { return flipped(-1); }
    // standard comparisons
    if (a[key] > b[key]) { return flipped(1); }
    if (a[key] < b[key]) { return flipped(-1); }
    // they must be equal
    return 0;
  };
}

function _genRow(state, item) {
  const row = {};

  // CONTENT NODES
  if (state.pageState.view_by_content_or_learners === ReportConstants.ViewBy.CONTENT) {
    row.kind = item.kind;
    row.id = item.pk;
    row.title = item.title;
    row.parent = { id: item.parent.pk, title: item.parent.title };

    // for content items, set exercise counts and progress appropriately
    if (item.kind === ContentNodeKinds.TOPIC) {
      row.exerciseCount = _countNodes(item.progress, _onlyExercises);
      row.exerciseProgress = calcProgress(
        item.progress,
        _onlyExercises,
        row.exerciseCount,
        getters.userCount(state)
      );
      row.contentCount = _countNodes(item.progress, _onlyContent);
      row.contentProgress = calcProgress(
        item.progress,
        _onlyContent,
        row.contentCount,
        getters.userCount(state)
      );
    } else if (_onlyExercises(item)) {
      row.exerciseCount = 1;
      row.exerciseProgress = item.progress[0].total_progress / getters.userCount(state);
      row.contentCount = 0;
      row.contentProgress = undefined;
    } else if (_onlyContent(item)) {
      row.exerciseCount = 0;
      row.exerciseProgress = undefined;
      row.contentCount = 1;
      row.contentProgress = item.progress[0].total_progress / getters.userCount(state);
    } else {
      logging.error(`Unhandled item kind: ${item.kind}`);
    }
    // LEARNERS
  } else if (state.pageState.view_by_content_or_learners === ReportConstants.ViewBy.LEARNERS) {
    row.kind = CoreConstants.USER;
    row.id = item.pk.toString(); // see https://github.com/learningequality/kolibri/issues/65;
    row.title = item.full_name;
    row.parent = undefined; // not currently used. Eventually, maybe classes/groups?

    // for learners, the exercise counts are the global values
    row.exerciseProgress
      = calcProgress(item.progress, _onlyExercises, getters.exerciseCount(state), 1);
    row.contentProgress
      = calcProgress(item.progress, _onlyContent, getters.contentCount(state), 1);
  } else {
    logging.error('Unknown view-by state', state.pageState.view_by_content_or_learners);
  }

  row.lastActive = item.last_active ? new Date(item.last_active) : null;

  return row;
}


// public vuex getters
Object.assign(getters, {
  completionCount(state) {
    const summary = state.pageState.content_scope_summary;
    if (summary.kind !== ContentNodeKinds.TOPIC) {
      return summary.progress[0].log_count_complete;
    }
    return undefined;
  },
  userCount(state) {
    return state.pageState.content_scope_summary.num_users;
  },
  exerciseCount(state) {
    const summary = state.pageState.content_scope_summary;
    if (summary.kind === ContentNodeKinds.TOPIC) {
      return _countNodes(summary.progress, _onlyExercises);
    } else if (summary.kind === ContentNodeKinds.EXERCISE) {
      return 1;
    }
    return 0;
  },
  exerciseProgress(state) {
    return calcProgress(
      state.pageState.content_scope_summary.progress,
      _onlyExercises,
      getters.exerciseCount(state),
      getters.userCount(state)
    );
  },
  contentCount(state) {
    const summary = state.pageState.content_scope_summary;
    if (summary.kind === ContentNodeKinds.TOPIC) {
      return _countNodes(summary.progress, _onlyContent);
    } else if (summary.kind !== ContentNodeKinds.EXERCISE) {
      return 1;
    }
    return 0;
  },
  contentProgress(state) {
    return calcProgress(
      state.pageState.content_scope_summary.progress,
      _onlyContent,
      getters.contentCount(state),
      getters.userCount(state)
    );
  },
  dataTable(state) {
    const data = state.pageState.table_data.map(item => _genRow(state, item));
    if (state.pageState.sort_order !== ReportConstants.SortOrders.NONE) {
      data.sort(_genCompareFunc(state.pageState.sort_column, state.pageState.sort_order));
    }
    return data;
  },
});


module.exports = getters;
