const Constants = require('./constants');
const CoreConstants = require('kolibri.coreVue.vuex.constants');
const ContentNodeKinds = CoreConstants.ContentNodeKinds;
const logging = require('kolibri.lib.logging');


// Object to be exported by this module.
const getters = {};


/* given an array of objects sum the keys on those that pass the filter */
function sumOfKeys(array, key, filter = () => true) {
  return array
    .filter(filter)
    .reduce((prev, item) => prev + item[key], 0);
}

function countNodes(progressArray, filter) {
  return sumOfKeys(progressArray, 'node_count', filter);
}

function calcProgress(progressArray, filter, itemCount, userCount) {
  const totalProgress = sumOfKeys(progressArray, 'total_progress', filter);
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
  columnToKey[Constants.TableColumns.NAME] = 'title';
  columnToKey[Constants.TableColumns.EXERCISE] = 'exerciseProgress';
  columnToKey[Constants.TableColumns.CONTENT] = 'contentProgress';
  columnToKey[Constants.TableColumns.DATE] = 'lastActive';
  const key = columnToKey[sortColumn];

  // take into account sort order
  const flipSortOrder = sortOrder === Constants.SortOrders.DESCENDING ? 1 : -1;
  // default order of names is A-Z; everything else goes high-low
  const flipNameCol = sortColumn !== Constants.TableColumns.NAME ? -1 : 1;
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

function genRow(state, item) {
  const row = {};

  // CONTENT NODES
  if (state.pageState.view_by_content_or_learners === Constants.ViewBy.CONTENT) {
    row.kind = item.kind;
    row.id = item.pk;
    row.title = item.title;
    row.parent = { id: item.parent.pk, title: item.parent.title };

    // for content items, set exercise counts and progress appropriately
    if (item.kind === ContentNodeKinds.TOPIC) {
      row.exerciseCount = countNodes(item.progress, onlyExercises);
      row.exerciseProgress = calcProgress(
        item.progress,
        onlyExercises,
        row.exerciseCount,
        getters.userCount(state)
      );
      row.contentCount = countNodes(item.progress, onlyContent);
      row.contentProgress = calcProgress(
        item.progress,
        onlyContent,
        row.contentCount,
        getters.userCount(state)
      );
    } else if (onlyExercises(item)) {
      row.exerciseCount = 1;
      row.exerciseProgress = item.progress[0].total_progress / getters.userCount(state);
      row.contentCount = 0;
      row.contentProgress = undefined;
    } else if (onlyContent(item)) {
      row.exerciseCount = 0;
      row.exerciseProgress = undefined;
      row.contentCount = 1;
      row.contentProgress = item.progress[0].total_progress / getters.userCount(state);
    } else {
      logging.error(`Unhandled item kind: ${item.kind}`);
    }
  // LEARNERS
  } else if (state.pageState.view_by_content_or_learners === Constants.ViewBy.LEARNERS) {
    row.kind = CoreConstants.USER;
    row.id = item.pk.toString(); // see https://github.com/learningequality/kolibri/issues/65;
    row.title = item.full_name;
    row.parent = undefined; // not currently used. Eventually, maybe classes/groups?

    // for learners, the exerise counts are the global values
    row.exerciseProgress
      = calcProgress(item.progress, onlyExercises, getters.exerciseCount(state), 1);
    row.contentProgress
      = calcProgress(item.progress, onlyContent, getters.contentCount(state), 1);
  } else {
    logging.error('Unknown view-by state', state.pageState.view_by_content_or_learners);
  }

  row.lastActive = item.last_active ? new Date(item.last_active) : null;

  return row;
}


// public vuex getters
Object.assign(getters, {
  usersCompleted(state) {
    return state.pageState.content_scope_summary.progress[0].log_count_complete;
  },
  userCount(state) {
    return state.pageState.content_scope_summary.num_users;
  },
  exerciseCount(state) {
    const summary = state.pageState.content_scope_summary;
    if (summary.kind === ContentNodeKinds.TOPIC) {
      return countNodes(summary.progress, onlyExercises);
    } else if (summary.kind === ContentNodeKinds.EXERCISE) {
      return 1;
    }
    return 0;
  },
  exerciseProgress(state) {
    return calcProgress(
      state.pageState.content_scope_summary.progress,
      onlyExercises,
      getters.exerciseCount(state),
      getters.userCount(state)
    );
  },
  contentCount(state) {
    const summary = state.pageState.content_scope_summary;
    if (summary.kind === ContentNodeKinds.TOPIC) {
      return countNodes(summary.progress, onlyContent);
    } else if (summary.kind !== ContentNodeKinds.EXERCISE) {
      return 1;
    }
    return 0;
  },
  contentProgress(state) {
    return calcProgress(
      state.pageState.content_scope_summary.progress,
      onlyContent,
      getters.contentCount(state),
      getters.userCount(state)
    );
  },
  dataTable(state) {
    const data = state.pageState.table_data.map(item => genRow(state, item));
    if (state.pageState.sort_order !== Constants.SortOrders.NONE) {
      data.sort(genCompareFunc(state.pageState.sort_column, state.pageState.sort_order));
    }
    return data;
  },
});


module.exports = getters;
