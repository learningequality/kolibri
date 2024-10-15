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

function notStartedStatusObj() {
  // create a dummy status object
  return { status: STATUSES.notStarted };
}

/*
 * Getters that return lookup functions
 * Implemented as getters for easy access to the store
 */

export default {
  getGroupIdsForAssignment(state) {
    return function (obj) {
      return obj.assignments.filter(id => id !== state.id);
    };
  },
  /*
   * Return array of group names given an array of group IDs
   */
  getGroupNames(state) {
    return function (groupIds) {
      if (!Array.isArray(groupIds)) {
        throw new Error('getGroupNames: invalid parameter(s)');
      }
      return groupIds.map(id => state.groupMap[id]?.name).filter(Boolean);
    };
  },
  /*
   * Return array of group names given a learner ID
   */
  getGroupNamesForLearner(state, getters) {
    return function (learnerId) {
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
    return function (groupIds) {
      if (!Array.isArray(groupIds)) {
        throw new Error('getLearnersForGroups: invalid parameter(s)');
      }
      if (!groupIds.length) {
        return map(state.learnerMap, 'id');
      }
      return uniq(flatten(map(groupIds, id => state.groupMap[id]?.member_ids || [])));
    };
  },
  /*
   * Return array of names of groups followed by names of assigned
   * ad hoc learners
   */
  getRecipientNamesForExam(state, getters) {
    return function (exam) {
      const adHocLearners = exam.learner_ids.map(learnerId => state.learnerMap[learnerId].name);
      const groups = getters.getGroupIdsForAssignment(exam);
      const recipientsForGroups =
        groups.length || !adHocLearners.length ? getters.getLearnersForGroups(groups) : [];
      const learnersInSelectedGroups = recipientsForGroups.map(
        learnerId => state.learnerMap[learnerId].name,
      );
      return getters
        .getGroupNames(groups)
        .concat(adHocLearners.filter(name => !learnersInSelectedGroups.includes(name)));
    };
  },
  getLearnersForAssignment(state, getters) {
    return function (assignment) {
      if (!assignment) {
        throw new Error('getLearnersForAssignment: invalid parameter(s)');
      }
      if (!assignment.assignments.length && !assignment.learner_ids.length) {
        return [];
      }
      const assignedToWholeClass = assignment.assignments.includes(state.id);
      if (assignedToWholeClass) {
        return Object.keys(state.learnerMap);
      }
      const groups = getters.getGroupIdsForAssignment(assignment);
      const adHocLearners = assignment.learner_ids;

      let learners;
      const totalLearnersInClass = Object.keys(state.learnerMap).length;

      if (getters.getLearnersForGroups(groups).length === totalLearnersInClass) {
        learners = adHocLearners;
      } else {
        learners = uniq(adHocLearners.concat(getters.getLearnersForGroups(groups)));
      }

      return adHocLearners.length ? learners : getters.getLearnersForGroups(groups);
    };
  },
  /*
   * Return array of learner IDs given an exam
   */
  getLearnersForExam(state, getters) {
    return getters.getLearnersForAssignment;
  },
  /*
   * Return array of learner IDs given a lesson
   */
  getLearnersForLesson(state, getters) {
    return getters.getLearnersForAssignment;
  },
  /*
   * Return array of names of groups followed by names of assigned
   * ad hoc learners
   */
  getRecipientNamesForLesson(state, getters) {
    return function (lesson) {
      const fullLesson = state.lessonMap[lesson.id];
      if (!fullLesson) {
        return [];
      }
      const groups = getters.getGroupIdsForAssignment(fullLesson);
      const recipientsForGroups = groups.length ? getters.getLearnersForGroups(groups) : [];
      const learnersInSelectedGroups = recipientsForGroups.map(
        learnerId => state.learnerMap[learnerId].name,
      );
      return getters
        .getGroupNames(groups)
        .concat(
          fullLesson.learner_ids
            .map(learnerId => state.learnerMap[learnerId].name)
            .filter(learner => !learnersInSelectedGroups.includes(learner)),
        );
    };
  },
  /*
   * Return a STATUSES constant given a content ID and a learner ID
   */
  getContentStatusObjForLearner(state) {
    return function (contentId, learnerId) {
      if (!contentId || !learnerId) {
        throw new Error('getContentStatusObjForLearner: invalid parameter(s)');
      }
      return get(state.contentLearnerStatusMap, [contentId, learnerId], notStartedStatusObj());
    };
  },
  /*
   * Return a 'tally object' given a content ID and an array of learner IDs
   */
  getContentStatusTally(state, getters) {
    return function (contentId, learnerIds) {
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
        const status = getters.getContentStatusObjForLearner(contentId, learnerId).status;
        tallies[keyMap[status]] += 1;
      });
      return tallies;
    };
  },
  /*
   * Return a STATUSES constant given an exam ID and a learner ID
   */
  getExamStatusObjForLearner(state) {
    return function (examId, learnerId) {
      if (!examId || !learnerId) {
        throw new Error('getExamStatusObjForLearner: invalid parameter(s)');
      }
      return get(state.examLearnerStatusMap, [examId, learnerId], notStartedStatusObj());
    };
  },
  /*
   * Return a 'tally object' given an exam ID and an array of learner IDs
   */
  getExamStatusTally(state, getters) {
    return function (examId, learnerIds) {
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
        const status = getters.getExamStatusObjForLearner(examId, learnerId);
        tallies[keyMap[status.status]] += 1;
      });
      return tallies;
    };
  },
  /*
   * Return a STATUSES constant given a lesson ID and a learner ID
   */
  getLessonStatusStringForLearner(state, getters) {
    return function (lessonId, learnerId) {
      if (!lessonId || !learnerId) {
        throw new Error('getLessonStatusStringForLearner: invalid parameter(s)');
      }
      return get(
        getters.lessonLearnerStatusMap,
        [lessonId, learnerId, 'status'],
        STATUSES.notStarted,
      );
    };
  },
  /*
   * Return a 'tally object' given a lesson ID and an array of learner IDs
   */
  getLessonStatusTally(state, getters) {
    return function (lessonId, learnerIds) {
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
        const status = getters.getLessonStatusStringForLearner(lessonId, learnerId);
        tallies[keyMap[status]] += 1;
      });
      return tallies;
    };
  },
  /*
   * Return a number (in seconds) given a content ID and an array of learner IDs
   */
  getContentAvgTimeSpent(state, getters) {
    return function (contentId, learnerIds) {
      if (!contentId || !Array.isArray(learnerIds)) {
        throw new Error('getContentAvgTimeSpent: invalid parameter(s)');
      }
      const statusObjects = [];
      learnerIds.forEach(learnerId => {
        const statusObj = getters.getContentStatusObjForLearner(contentId, learnerId);
        if (statusObj.status !== STATUSES.notStarted) {
          statusObjects.push(statusObj);
        }
      });
      if (!statusObjects.length) {
        return undefined;
      }
      return meanBy(statusObjects, 'time_spent');
    };
  },
  /*
   * Return a number (0-1) given an exam ID and an array of learner IDs
   */
  getExamAvgScore(state, getters) {
    return function (examId, learnerIds) {
      if (!examId || !Array.isArray(learnerIds)) {
        throw new Error('getExamAvgScore: invalid parameter(s)');
      }
      const statusObjects = [];
      learnerIds.forEach(learnerId => {
        const statusObj = getters.getExamStatusObjForLearner(examId, learnerId);
        if (statusObj.status === STATUSES.completed) {
          statusObjects.push(statusObj);
        }
      });
      if (!statusObjects.length) {
        return undefined;
      }
      return meanBy(statusObjects, 'score');
    };
  },
};
