import map from 'lodash/map';
import get from 'lodash/get';
import uniq from 'lodash/uniq';
import meanBy from 'lodash/meanBy';
import flatten from 'lodash/flatten';
import { STATUSES } from './constants';

const keyMap = {
  [STATUSES.completed]: 'completed',
  [STATUSES.started]: 'started',
  [STATUSES.notStarted]: 'notStarted',
  [STATUSES.helpNeeded]: 'helpNeeded',
};

/*
 * Getters that return lookup functions
 * Implemented as getters for easy access to the store
 */

export default {
  /*
   * Return array of group names given an array of group IDs
   */
  getGroupNames(state) {
    return function(groupIds) {
      if (!Array.isArray(groupIds)) {
        throw new Error('getGroupNames: invalid parameter(s)');
      }
      return groupIds.map(id => state.groupMap[id].name);
    };
  },
  /*
   * Return array of group names given a learner ID
   */
  getGroupNamesForLearner(state, getters) {
    return function(learnerId) {
      if (!learnerId) {
        throw new Error('getGroupNamesForLearner: invalid parameter(s)');
      }
      return getters.groups
        .filter(group => group.member_ids.includes(learnerId))
        .map(group => group.name);
    };
  },
  /*
   * Return array of learner IDs given an array of group IDs.
   * An empty list is considered the whole class in the context of assignment.
   */
  getLearnersForGroups(state) {
    return function(groupIds) {
      if (!Array.isArray(groupIds)) {
        throw new Error('getLearnersForGroups: invalid parameter(s)');
      }
      if (!groupIds.length) {
        return map(state.learnerMap, 'id');
      }
      return uniq(flatten(map(groupIds, id => state.groupMap[id].member_ids)));
    };
  },
  /*
   * Return a STATUSES constant given a content ID and a learner ID
   */
  getContentStatusForLearner(state) {
    return function(contentId, learnerId) {
      if (!contentId || !learnerId) {
        throw new Error('getContentStatusForLearner: invalid parameter(s)');
      }
      return get(
        state.contentLearnerStatusMap,
        [contentId, learnerId, 'status'],
        STATUSES.notStarted
      );
    };
  },
  /*
   * Return a 'tally object' given a content ID and an array of learner IDs
   */
  getContentStatusTally(state, getters) {
    return function(contentId, learnerIds) {
      if (!contentId || !Array.isArray(learnerIds)) {
        throw new Error('getContentStatusTally: invalid parameter(s)');
      }
      const tallies = {
        started: 0,
        notStarted: 0,
        completed: 0,
        helpNeeded: 0,
      };
      learnerIds.forEach(learnerId => {
        const status = getters.getContentStatusForLearner(contentId, learnerId);
        tallies[keyMap[status]] += 1;
      });
      return tallies;
    };
  },
  /*
   * Return a STATUSES constant given an exam ID and a learner ID
   */
  getExamStatusForLearner(state) {
    return function(examId, learnerId) {
      if (!examId || !learnerId) {
        throw new Error('getExamStatusForLearner: invalid parameter(s)');
      }
      return get(state.examLearnerStatusMap, [examId, learnerId, 'status'], STATUSES.notStarted);
    };
  },
  /*
   * Return a 'tally object' given an exam ID and an array of learner IDs
   */
  getExamStatusTally(state, getters) {
    return function(examId, learnerIds) {
      if (!examId || !Array.isArray(learnerIds)) {
        throw new Error('getExamStatusTally: invalid parameter(s)');
      }
      const tallies = {
        started: 0,
        notStarted: 0,
        completed: 0,
        helpNeeded: 0,
      };
      learnerIds.forEach(learnerId => {
        const status = getters.getExamStatusForLearner(examId, learnerId);
        tallies[keyMap[status]] += 1;
      });
      return tallies;
    };
  },
  /*
   * Return a STATUSES constant given a lesson ID and a learner ID
   */
  getLessonStatusForLearner(state, getters) {
    return function(lessonId, learnerId) {
      if (!lessonId || !learnerId) {
        throw new Error('getLessonStatusForLearner: invalid parameter(s)');
      }
      return get(getters.lessonLearnerStatusMap, [lessonId, learnerId], STATUSES.notStarted);
    };
  },
  /*
   * Return a 'tally object' given a lesson ID and an array of learner IDs
   */
  getLessonStatusTally(state, getters) {
    return function(lessonId, learnerIds) {
      if (!lessonId || !Array.isArray(learnerIds)) {
        throw new Error('getLessonStatusTally: invalid parameter(s)');
      }
      const tallies = {
        started: 0,
        notStarted: 0,
        completed: 0,
        helpNeeded: 0,
      };
      learnerIds.forEach(learnerId => {
        const status = getters.getLessonStatusForLearner(lessonId, learnerId);
        tallies[keyMap[status]] += 1;
      });
      return tallies;
    };
  },
  /*
   * Return a number (in seconds) given a content ID and an array of learner IDs
   */
  getContentAvgTimeSpent(state, getters) {
    return function(contentId, learnerIds) {
      if (!contentId || !Array.isArray(learnerIds)) {
        throw new Error('getContentAvgTimeSpent: invalid parameter(s)');
      }
      const statuses = [];
      learnerIds.forEach(learnerId => {
        const status = getters.getContentStatusForLearner(contentId, learnerId);
        if (status !== STATUSES.notStarted) {
          statuses.push(state.contentLearnerStatusMap[contentId][learnerId]);
        }
      });
      if (!statuses.length) {
        return undefined;
      }
      return meanBy(statuses, 'time_spent');
    };
  },
  /*
   * Return a number (0-1) given an exam ID and an array of learner IDs
   */
  getExamAvgScore(state, getters) {
    return function(examId, learnerIds) {
      if (!examId || !Array.isArray(learnerIds)) {
        throw new Error('getExamAvgScore: invalid parameter(s)');
      }
      const statuses = [];
      learnerIds.forEach(learnerId => {
        const status = getters.getExamStatusForLearner(examId, learnerId);
        if (status !== STATUSES.notStarted) {
          statuses.push(state.examLearnerStatusMap[examId][learnerId]);
        }
      });
      if (!statuses.length) {
        return undefined;
      }
      return meanBy(statuses, 'score');
    };
  },
};
