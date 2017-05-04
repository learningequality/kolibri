const ReportConstants = require('../../reportConstants');
const CoreConstants = require('kolibri.coreVue.vuex.constants');
const logging = require('kolibri.lib.logging');
const ReportUtils = require('./reportUtils');
const { classMemberCount } = require('./main');

const ContentNodeKinds = CoreConstants.ContentNodeKinds;


// Object to be exported by this module.
const getters = {
  sortColumn: state => (state.pageState || {}).sortColumn,
  sortOrder: state => (state.pageState || {}).sortOrder,
};


function _genRow(state, item) {
  const row = {};

  if (state.pageState.viewBy === ReportConstants.ViewBy.LEARNER) {
    // LEARNERS
    row.kind = CoreConstants.USER;
    row.id = item.id;
    row.title = item.fullName;
    row.parent = undefined; // not currently used. Eventually, maybe classes/groups?

    // for learners, the exercise counts are the global values
    row.exerciseProgress = ReportUtils.calcProgress(
      item.progress, ReportUtils.onlyExercises, getters.exerciseCount(state), 1
    );
    row.contentProgress = ReportUtils.calcProgress(
      item.progress, ReportUtils.onlyContent, getters.contentCount(state), 1
    );
  } else if (state.pageState.viewBy === ReportConstants.ViewBy.CHANNEL) {
    row.id = item.id;
    row.title = item.title;
  } else {
    // CONTENT NODES
    row.kind = item.kind;
    row.id = item.id;
    row.title = item.title;
    row.parent = { id: item.parent.id, title: item.parent.title };

    if (state.pageState.viewBy === ReportConstants.ViewBy.CONTENT) {
      // for content items, set exercise counts and progress appropriately
      if (item.kind === ContentNodeKinds.TOPIC) {
        row.exerciseCount = ReportUtils.countNodes(item.progress, ReportUtils.onlyExercises);
        row.exerciseProgress = ReportUtils.calcProgress(
          item.progress,
          ReportUtils.onlyExercises,
          row.exerciseCount,
          getters.userCount(state)
        );
        row.contentCount = ReportUtils.countNodes(item.progress, ReportUtils.onlyContent);
        row.contentProgress = ReportUtils.calcProgress(
          item.progress,
          ReportUtils.onlyContent,
          row.contentCount,
          getters.userCount(state)
        );
      } else if (ReportUtils.onlyExercises(item)) {
        row.exerciseCount = 1;
        row.exerciseProgress = item.progress[0].totalProgress / getters.userCount(state);
        row.contentCount = 0;
        row.contentProgress = undefined;
      } else if (ReportUtils.onlyContent(item)) {
        row.exerciseCount = 0;
        row.exerciseProgress = undefined;
        row.contentCount = 1;
        row.contentProgress = item.progress[0].totalProgress / getters.userCount(state);
      } else {
        logging.error(`Unhandled item kind: ${item.kind}`);
      }
    } else {
      row.contentCount = 1;
      row.contentProgress = item.progress[0].totalProgress / classMemberCount(state);
      row.logCountComplete = item.progress[0].logCountComplete;
    }
  }
  row.lastActive = item.lastActive ? new Date(item.lastActive) : null;
  return row;
}


// public vuex getters
Object.assign(getters, {
  completionCount(state) {
    const summary = state.pageState.contentScopeSummary;
    if (summary.kind !== ContentNodeKinds.TOPIC) {
      return summary.progress[0].logCountComplete;
    }
    return undefined;
  },
  userCount(state) {
    return state.pageState.contentScopeSummary.numUsers;
  },
  exerciseCount(state) {
    const summary = state.pageState.contentScopeSummary;
    if (summary.kind === ContentNodeKinds.TOPIC ||
      summary.kind === CoreConstants.ContentNodeKinds.CHANNEL) {
      return ReportUtils.countNodes(summary.progress, ReportUtils.onlyExercises);
    } else if (summary.kind === ContentNodeKinds.EXERCISE) {
      return 1;
    }
    return 0;
  },
  exerciseProgress(state) {
    return ReportUtils.calcProgress(
      state.pageState.contentScopeSummary.progress,
      ReportUtils.onlyExercises,
      getters.exerciseCount(state),
      getters.userCount(state)
    );
  },
  contentCount(state) {
    const summary = state.pageState.contentScopeSummary;
    if (summary.kind === ContentNodeKinds.TOPIC ||
      summary.kind === CoreConstants.ContentNodeKinds.CHANNEL) {
      return ReportUtils.countNodes(summary.progress, ReportUtils.onlyContent);
    } else if (summary.kind !== ContentNodeKinds.EXERCISE) {
      return 1;
    }
    return 0;
  },
  contentProgress(state) {
    return ReportUtils.calcProgress(
      state.pageState.contentScopeSummary.progress,
      ReportUtils.onlyContent,
      getters.contentCount(state),
      getters.userCount(state)
    );
  },
  standardDataTable(state) {
    const data = state.pageState.tableData.map(item => _genRow(state, item));
    if (state.pageState.sortOrder !== ReportConstants.SortOrders.NONE) {
      data.sort(ReportUtils.genCompareFunc(state.pageState.sortColumn, state.pageState.sortOrder));
    }
    return data;
  },
});


module.exports = getters;
