

/* given an array of objects sum the keys on those that pass the filter */
function sumOfKeys(array, key, filter = () => true) {
  return array
    .filter(filter)
    .reduce((prev, item) => prev + item[key], 0);
}


const getters = {
  exerciseCount(state) {
    return sumOfKeys(
      state.pageState.content_scope_summary.progress,
      'node_count',
      item => item.kind === 'exercise'
    );
  },
  exerciseProgress(state) {
    const totalProgress = sumOfKeys(
      state.pageState.content_scope_summary.progress,
      'total_progress',
      item => item.kind === 'exercise'
    );
    if (getters.exerciseCount(state)) {
      return totalProgress / getters.exerciseCount(state);
    }
    return undefined;
  },
  contentCount(state) {
    return sumOfKeys(
      state.pageState.content_scope_summary.progress,
      'node_count',
      item => item.kind !== 'exercise'
    );
  },
  contentProgress(state) {
    const totalProgress = sumOfKeys(
      state.pageState.content_scope_summary.progress,
      'total_progress',
      item => item.kind !== 'exercise'
    );
    if (getters.contentCount(state)) {
      return totalProgress / getters.contentCount(state);
    }
    return undefined;
  },
};


module.exports = getters;
