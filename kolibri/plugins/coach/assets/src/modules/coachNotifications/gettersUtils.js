import orderBy from 'lodash/orderBy';
import findKey from 'lodash/findKey';
import map from 'lodash/map';
import partition from 'lodash/partition';
import { CollectionTypes } from '../../constants/lessonsConstants';

// Utility functions that need to access data in 'classSummary' module
// The classSummary argument to these functions is a reference to a special
// 'coachNotificationsData' getter implemented in the 'classSummary' module.

// Paritions a collection's user ID list based on whether a user is present in
// in the events list. e.g. members of the first array are in the subset that completed
// a resource.
export function partitionCollectionByEvents({
  classSummary,
  events,
  collectionId,
  collectionType,
}) {
  // events array must be homogenous in the Object, Event, Lesson/ContentNode ID
  let partitioned;
  const { learners, learnerGroups } = classSummary;
  const eventsUserIds = map(events, 'user_id');
  const userIsInEvent = id => eventsUserIds.includes(id);

  if (collectionType === CollectionTypes.CLASSROOM) {
    partitioned = partition(Object.keys(learners), userIsInEvent);
  } else {
    const match = learnerGroups[collectionId];
    // If no match, Learner Group must have been deleted
    if (!match) return null;
    partitioned = partition(match.member_ids, userIsInEvent);
  }

  return {
    hasEvent: partitioned[0],
    rest: partitioned[1],
  };
}

// Returns a Maybe [{ collection_kind, collection }] object, given a lessonId.
// Returns null when lesson has been deleted.
export function getCollectionsForAssignment({ classSummary, assignment }) {
  let collections = [];
  const { id: assignmentId, type: assignmentType } = assignment;
  const { exams, lessons, classId, className, learnerGroups } = classSummary;
  let assignmentMatch;
  if (assignmentType === 'lesson') {
    assignmentMatch = lessons[assignmentId];
  } else {
    assignmentMatch = exams[assignmentId];
  }

  // If lesson or exam wasn't found in classSummary, then it was probably deleted.
  if (!assignmentMatch) return null;

  const { groups } = assignmentMatch;

  // In classSummary, if (exam|lesson).groups is empty, it means it was
  // assigned to the entire class
  if (groups.length === 0) {
    // Matches the shape of the Collection API
    collections.push({
      collection_kind: CollectionTypes.CLASSROOM,
      collection: classId,
      name: className,
    });
  } else {
    groups.forEach(groupId => {
      const groupMatch = learnerGroups[groupId];
      if (groupMatch) {
        collections.push({
          collection_kind: CollectionTypes.LEARNERGROUP,
          collection: groupMatch.id,
          name: groupMatch.name,
        });
      }
    });
  }

  return collections;
}

// Just makes an params object that should work with all the paths.
// It has extra params that may not be used by some routes.
// See reportRoutes.js for details on param naming.
function makeParams(notification) {
  return {
    groupId: notification.collection.id,
    lessonId: notification.assignment.id,
    quizId: notification.assignment.id,
    resourceId: notification.resource.content_id,
    exerciseId: notification.resource.content_id,
    learnerId: notification.learnerSummary.firstUserId,
    // For individual Quiz or Exercise notifications, default to first index for everything
    questionId: 0,
    interactionIndex: 0,
  };
}

// Data used for 'notificationLink' helper.
// object, isMultiple, and wholeClass are meant to be pattern matched
const pageNameToNotificationPropsMap = {
  ReportsGroupReportLessonExerciseLearnerListPage: {
    object: 'Exercise',
    isMultiple: true,
    isWholeClass: false,
  },
  ReportsGroupReportLessonResourceLearnerListPage: {
    object: 'NonExercise',
    isMultiple: true,
    isWholeClass: false,
  },
  ReportsGroupReportLessonPage: {
    object: 'Lesson',
    isMultiple: true,
    isWholeClass: false,
  },
  ReportsGroupReportQuizLearnerListPage: {
    object: 'Quiz',
    isMultiple: true,
    isWholeClass: false,
  },
  ReportsLessonExerciseLearnerListPage: {
    object: 'Exercise',
    isMultiple: true,
    isWholeClass: true,
  },
  ReportsLessonResourceLearnerListPage: {
    object: 'NonExercise',
    isMultiple: true,
    isWholeClass: true,
  },
  ReportsLessonLearnerListPage: {
    object: 'Lesson',
    isMultiple: true,
    isWholeClass: true,
  },
  ReportsQuizLearnerListPage: {
    object: 'Quiz',
    isMultiple: true,
    isWholeClass: true,
  },
  ReportsGroupReportLessonExerciseLearnerPage: {
    object: 'Exercise',
    isMultiple: false,
    isWholeClass: false,
  },
  ReportsGroupLearnerReportLessonPage: {
    object: 'Lesson',
    isMultiple: false,
    isWholeClass: false,
  },
  ReportsGroupLearnerReportQuizPage: {
    object: 'Quiz',
    isMultiple: false,
    isWholeClass: false,
  },
  REPORTS_LESSON_EXERCISE_LEARNER_PAGE_ROOT: {
    object: 'Exercise',
    isMultiple: false,
    isWholeClass: true,
  },
  ReportsLessonLearnerPage: {
    object: 'Lesson',
    isMultiple: false,
    isWholeClass: true,
  },
  ReportsQuizLearnerPage: {
    object: 'Quiz',
    isMultiple: false,
    isWholeClass: true,
  },
};

export function notificationLink(notification) {
  let object;
  const { learnerSummary } = notification;
  if (notification.object === 'Resource') {
    // Individual resources
    object = notification.resource.type === 'exercise' ? 'Exercise' : 'NonExercise';
  } else {
    // Quizzes or whole Lessons
    object = notification.object;
  }

  let isMultiple;

  if (notification.event === 'HelpNeeded') {
    isMultiple = false;
  } else if (learnerSummary.total === 1 && learnerSummary.completesCollection) {
    isMultiple = true;
  } else if (learnerSummary.total === 1 && !learnerSummary.completesCollection) {
    isMultiple = false;
  } else {
    isMultiple = learnerSummary.total > 1;
  }

  const matchingPageType = findKey(pageNameToNotificationPropsMap, {
    object,
    isMultiple,
    isWholeClass: notification.collection.type === 'classroom',
  });

  if (matchingPageType) {
    return {
      name: matchingPageType,
      params: makeParams(notification),
    };
  } else {
    return null;
  }
}
