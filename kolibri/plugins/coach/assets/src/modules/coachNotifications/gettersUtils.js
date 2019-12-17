import find from 'lodash/find';
import map from 'lodash/map';
import get from 'lodash/get';
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
  const { learners, learnerGroups, adHocGroupsMap } = classSummary;
  const eventsUserIds = map(events, 'user_id');
  const userIsInEvent = id => eventsUserIds.includes(id);

  if (collectionType === CollectionTypes.CLASSROOM) {
    partitioned = partition(Object.keys(learners), userIsInEvent);
  } else {
    const match = learnerGroups[collectionId] || adHocGroupsMap[collectionId];
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
  const { exams, lessons, classId, className, learnerGroups, adHocGroupsMap } = classSummary;
  let assignmentMatch;
  if (assignmentType === 'lesson') {
    assignmentMatch = lessons[assignmentId];
  } else {
    assignmentMatch = exams[assignmentId];
  }

  // If lesson or exam wasn't found in classSummary, then it was probably deleted.
  if (!assignmentMatch) return null;

  const { groups } = assignmentMatch;

  // Ensure we get assigned ad hoc group if it exists
  const adHocLearnersGroupId = Object.keys(adHocGroupsMap).find(id =>
    assignmentMatch.assignments.includes(id)
  );
  // Then get the learners for that group, if any, or default to empty array
  const adHocLearners = get(adHocGroupsMap, [adHocLearnersGroupId, 'member_ids'], []);

  // In classSummary, if (exam|lesson).groups is empty, it means it was
  // assigned to the entire class unless there are ad hoc learners assigned
  if (groups.length === 0 && !adHocLearners.length) {
    // Matches the shape of the Collection API
    collections.push({
      collection_kind: CollectionTypes.CLASSROOM,
      collection: classId,
      name: className,
    });
  } else {
    // Either groups.length is not zero, or we have adhoclearners
    // Cover both possibilities below
    if (adHocLearners.length) {
      collections.push({
        collection_kind: CollectionTypes.ADHOCLEARNERSGROUP,
        collection: adHocLearnersGroupId,
        name: 'Individual learner',
      });
    }
    if (groups.length) {
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
const pageNameToNotificationPropsMap = [
  {
    key: {
      object: 'Exercise',
      isMultiple: true,
      isWholeClass: false,
    },
    value: 'ReportsGroupReportLessonExerciseLearnerListPage',
  },
  {
    key: {
      object: 'NonExercise',
      isMultiple: true,
      isWholeClass: false,
    },
    value: 'ReportsGroupReportLessonResourceLearnerListPage',
  },
  {
    key: {
      object: 'Lesson',
      isMultiple: true,
      isWholeClass: false,
    },
    value: 'ReportsGroupReportLessonPage',
  },
  {
    key: {
      object: 'Quiz',
      isMultiple: true,
      isWholeClass: false,
    },
    value: 'ReportsGroupReportQuizLearnerListPage',
  },
  {
    key: {
      object: 'Exercise',
      isMultiple: true,
      isWholeClass: true,
    },
    value: 'ReportsLessonExerciseLearnerListPage',
  },
  {
    key: {
      object: 'NonExercise',
      isMultiple: true,
      isWholeClass: true,
    },
    value: 'ReportsLessonResourceLearnerListPage',
  },
  {
    key: {
      object: 'Lesson',
      isMultiple: true,
      isWholeClass: true,
    },
    value: 'ReportsLessonLearnerListPage',
  },
  {
    key: {
      object: 'Quiz',
      isMultiple: true,
      isWholeClass: true,
    },
    value: 'ReportsQuizLearnerListPage',
  },
  {
    key: {
      object: 'Exercise',
      isMultiple: false,
      isWholeClass: false,
    },
    value: 'ReportsGroupReportLessonExerciseLearnerPage',
  },
  {
    key: {
      object: 'Lesson',
      isMultiple: false,
      isWholeClass: false,
    },
    value: 'ReportsLessonLearnerPage',
  },
  {
    key: {
      object: 'Quiz',
      isMultiple: false,
      isWholeClass: false,
    },
    value: 'ReportsLearnerReportQuizPage',
  },
  {
    key: {
      object: 'Exercise',
      isMultiple: false,
      isWholeClass: true,
    },
    value: 'REPORTS_LESSON_EXERCISE_LEARNER_PAGE_ROOT',
  },
  {
    key: {
      object: 'Lesson',
      isMultiple: false,
      isWholeClass: true,
    },
    value: 'ReportsLessonLearnerPage',
  },
  {
    key: {
      object: 'Quiz',
      isMultiple: false,
      isWholeClass: true,
    },
    value: 'ReportsQuizLearnerPage',
  },
];

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

  const matchingPageType = find(pageNameToNotificationPropsMap, {
    key: {
      object,
      isMultiple,
      isWholeClass: notification.collection.type === 'classroom',
    },
  });

  if (matchingPageType) {
    return {
      name: matchingPageType.value,
      params: makeParams(notification),
    };
  } else {
    return null;
  }
}
