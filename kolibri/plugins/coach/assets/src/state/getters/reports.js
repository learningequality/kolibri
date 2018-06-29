import { ContentNodeKinds, USER } from 'kolibri.coreVue.vuex.constants';
import { now } from 'kolibri.utils.serverClock';
import differenceInDays from 'date-fns/difference_in_days';
import logger from 'kolibri.lib.logging';
import { ViewBy, SortOrders, RECENCY_THRESHOLD_IN_DAYS } from '../../constants/reportConstants';
import { PageNames } from '../../constants';
import * as ReportUtils from './reportUtils';
import { classMemberCount } from './classes';

const logging = logger.getLogger(__filename);

// Object to be exported by this module.
export const sortColumn = state => (state.pageState || {}).sortColumn;
export const sortOrder = state => (state.pageState || {}).sortOrder;

// public vuex getters
export const completionCount = state => {
  const summary = state.pageState.contentScopeSummary;
  if (summary.kind !== ContentNodeKinds.TOPIC) {
    return summary.progress[0].logCountComplete;
  }
  return undefined;
};

export const userCount = state => {
  return state.pageState.contentScopeSummary.numUsers;
};

export const exerciseCount = state => {
  const { kind, progress } = state.pageState.contentScopeSummary;
  if (kind === ContentNodeKinds.TOPIC || kind === ContentNodeKinds.CHANNEL) {
    return ReportUtils.countNodes(progress, ReportUtils.onlyExercises);
  }
  return kind === ContentNodeKinds.EXERCISE ? 1 : 0;
};

export const exerciseProgress = state => {
  return ReportUtils.calcProgress(
    state.pageState.contentScopeSummary.progress,
    ReportUtils.onlyExercises,
    exerciseCount(state),
    userCount(state)
  );
};

export const contentCount = state => {
  const { kind, progress } = state.pageState.contentScopeSummary;
  if (kind === ContentNodeKinds.TOPIC || kind === ContentNodeKinds.CHANNEL) {
    return ReportUtils.countNodes(progress, ReportUtils.onlyContent);
  }
  return kind !== ContentNodeKinds.EXERCISE ? 1 : 0;
};

export const contentProgress = state => {
  return ReportUtils.calcProgress(
    state.pageState.contentScopeSummary.progress,
    ReportUtils.onlyContent,
    contentCount(state),
    userCount(state)
  );
};

function _genRow(state, item) {
  const row = {};

  if (state.pageState.viewBy === ViewBy.LEARNER) {
    // LEARNERS
    row.kind = USER;
    row.id = item.id;
    row.title = item.fullName;
    row.groupName = item.groupName;
    row.parent = undefined; // not currently used. Eventually, maybe classes/groups?

    // for root list (of channels) we don't currently calculate progress
    if (state.pageName !== PageNames.LEARNER_LIST) {
      // for learners, the exercise counts are the global values
      row.exerciseProgress = ReportUtils.calcProgress(
        item.progress,
        ReportUtils.onlyExercises,
        exerciseCount(state),
        1
      );
      row.contentProgress = ReportUtils.calcProgress(
        item.progress,
        ReportUtils.onlyContent,
        contentCount(state),
        1
      );
    }
  } else if (state.pageState.viewBy === ViewBy.CHANNEL) {
    row.id = item.id;
    row.title = item.title;
    row.num_coach_contents = item.num_coach_contents;
  } else {
    // CONTENT NODES
    row.num_coach_contents = item.num_coach_contents;
    row.kind = item.kind;
    row.id = item.id;
    row.contentId = item.contentId;
    row.title = item.title;

    if (state.pageState.viewBy === ViewBy.CONTENT) {
      // for content items, set exercise counts and progress appropriately
      if (item.kind === ContentNodeKinds.TOPIC) {
        row.exerciseCount = ReportUtils.countNodes(item.progress, ReportUtils.onlyExercises);
        row.exerciseProgress = ReportUtils.calcProgress(
          item.progress,
          ReportUtils.onlyExercises,
          row.exerciseCount,
          userCount(state)
        );
        row.contentCount = ReportUtils.countNodes(item.progress, ReportUtils.onlyContent);
        row.contentProgress = ReportUtils.calcProgress(
          item.progress,
          ReportUtils.onlyContent,
          row.contentCount,
          userCount(state)
        );
      } else if (ReportUtils.onlyExercises(item)) {
        row.exerciseCount = 1;
        row.exerciseProgress = item.progress[0].totalProgress / userCount(state);
        row.contentCount = 0;
        row.contentProgress = undefined;
      } else if (ReportUtils.onlyContent(item)) {
        row.exerciseCount = 0;
        row.exerciseProgress = undefined;
        row.contentCount = 1;
        row.contentProgress = item.progress[0].totalProgress / userCount(state);
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

export const standardDataTable = state => {
  const { tableData, sortOrder, sortColumn, showRecentOnly } = state.pageState;
  const data = tableData.map(item => _genRow(state, item));
  if (sortOrder !== SortOrders.NONE) {
    data.sort(ReportUtils.genCompareFunc(sortColumn, sortOrder));
  }
  if (showRecentOnly) {
    return data.filter(
      row => row.lastActive && differenceInDays(now(), row.lastActive) <= RECENCY_THRESHOLD_IN_DAYS
    );
  }
  return data;
};
