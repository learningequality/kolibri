
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
    // content
    if (state.pageState.view_by_content_or_learners === Constants.ViewBy.CONTENT) {
      return state.pageState.table_data.map(item => ({
        kind: item.kind,
        id: item.pk,
        lastActive: item.last_active ? new Date(item.last_active) : null,
        title: item.title,
        parent: { id: item.parent.pk, title: item.parent.title },
        exerciseProgress: calcProgress(item.progress, onlyExercises, getters.exerciseCount(state)),
        contentProgress: calcProgress(item.progress, onlyContent, getters.contentCount(state)),
      }));
    } else if (state.pageState.view_by_content_or_learners === Constants.ViewBy.LEARNERS) {
      return state.pageState.table_data.map(item => ({
        kind: 'user',
        id: item.pk,
        lastActive: item.last_active ? new Date(item.last_active) : null,
        title: item.full_name,
        exerciseProgress: calcProgress(item.details, onlyExercises, getters.exerciseCount(state)),
        contentProgress: calcProgress(item.details, onlyContent, getters.contentCount(state)),
      }));
    }
    logging.error('Unknown view-by state', state.pageState.view_by_content_or_learners);
    return [];
  },
};


module.exports = getters;
