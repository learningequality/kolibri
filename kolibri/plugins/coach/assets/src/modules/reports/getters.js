import { ContentNodeKinds, USER } from 'kolibri.coreVue.vuex.constants';
import { now } from 'kolibri.utils.serverClock';
import differenceInDays from 'date-fns/difference_in_days';
import logger from 'kolibri.lib.logging';
import { ViewBy, SortOrders, RECENCY_THRESHOLD_IN_DAYS } from '../../constants/reportConstants';
import { PageNames } from '../../constants';
import * as ReportUtils from './utils';

const logging = logger.getLogger(__filename);

export function userCount(state) {
  return state.contentScopeSummary.num_users;
}

export function exerciseCount(state) {
  const { kind, progress } = state.contentScopeSummary;
  if (kind === ContentNodeKinds.TOPIC || kind === ContentNodeKinds.CHANNEL) {
    return ReportUtils.countNodes(progress, ReportUtils.onlyExercises);
  }
  return kind === ContentNodeKinds.EXERCISE ? 1 : 0;
}

export function contentCount(state) {
  const { kind, progress } = state.contentScopeSummary;
  if (kind === ContentNodeKinds.TOPIC || kind === ContentNodeKinds.CHANNEL) {
    return ReportUtils.countNodes(progress, ReportUtils.onlyContent);
  }
  return kind !== ContentNodeKinds.EXERCISE ? 1 : 0;
}

function _genRow(state, item, getters, rootState, rootGetters) {
  const row = {};

  if (state.viewBy === ViewBy.LEARNER) {
    // LEARNERS
    row.kind = USER;
    row.id = item.id;
    row.title = item.full_name;
    row.groupName = item.groupName;
    row.parent = undefined; // not currently used. Eventually, maybe classes/groups?

    // for root list (of channels) we don't currently calculate progress
    if (rootState.pageName !== PageNames.LEARNER_LIST) {
      // for learners, the exercise counts are the global values
      row.exerciseProgress = ReportUtils.calcProgress(
        item.progress,
        ReportUtils.onlyExercises,
        getters.exerciseCount,
        1
      );
      row.contentProgress = ReportUtils.calcProgress(
        item.progress,
        ReportUtils.onlyContent,
        getters.contentCount,
        1
      );
    }
  } else if (state.viewBy === ViewBy.CHANNEL) {
    row.id = item.id;
    row.title = item.title;
    row.num_coach_contents = item.num_coach_contents;
  } else {
    // CONTENT NODES
    row.num_coach_contents = item.num_coach_contents;
    row.kind = item.kind;
    row.id = item.id;
    row.contentId = item.content_id;
    row.title = item.title;

    if (state.viewBy === ViewBy.CONTENT) {
      // for content items, set exercise counts and progress appropriately
      if (item.kind === ContentNodeKinds.TOPIC) {
        row.exerciseCount = ReportUtils.countNodes(item.progress, ReportUtils.onlyExercises);
        row.exerciseProgress = ReportUtils.calcProgress(
          item.progress,
          ReportUtils.onlyExercises,
          row.exerciseCount,
          getters.userCount
        );
        row.contentCount = ReportUtils.countNodes(item.progress, ReportUtils.onlyContent);
        row.contentProgress = ReportUtils.calcProgress(
          item.progress,
          ReportUtils.onlyContent,
          row.contentCount,
          getters.userCount
        );
      } else if (ReportUtils.onlyExercises(item)) {
        row.exerciseCount = 1;
        row.exerciseProgress = item.progress[0].total_progress / getters.userCount;
        row.contentCount = 0;
        row.contentProgress = undefined;
      } else if (ReportUtils.onlyContent(item)) {
        row.exerciseCount = 0;
        row.exerciseProgress = undefined;
        row.contentCount = 1;
        row.contentProgress = item.progress[0].total_progress / getters.userCount;
      } else {
        logging.error(`Unhandled item kind: ${item.kind}`);
      }
    } else {
      row.contentCount = 1;
      row.contentProgress = item.progress[0].total_progress / rootGetters.classMemberCount;
      row.logCountComplete = item.progress[0].log_count_complete;
    }
  }
  row.lastActive = item.last_active ? new Date(item.last_active) : null;
  return row;
}

export function standardDataTable(state, getters, rootState, rootGetters) {
  const { tableData, sortOrder, sortColumn, showRecentOnly } = state;
  try {
    const data = tableData.map(item => _genRow(state, item, getters, rootState, rootGetters));
    if (sortOrder !== SortOrders.NONE) {
      data.sort(ReportUtils.genCompareFunc(sortColumn, sortOrder));
    }
    if (showRecentOnly) {
      return data.filter(
        row =>
          row.lastActive && differenceInDays(now(), row.lastActive) <= RECENCY_THRESHOLD_IN_DAYS
      );
    }
    return data;
  } catch (err) {
    // Ignore errors resulting when handlers don't fill in data at the right time.
    // TODO _genRow needs some refactoring to make it always safe.
    return [];
  }
}
