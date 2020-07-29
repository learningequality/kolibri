import find from 'lodash/find';
import { CollectionTypes } from '../../constants/lessonsConstants';

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
      isWholeClass:
        notification.collection.type === CollectionTypes.CLASSROOM ||
        notification.collection.type === CollectionTypes.ADHOCLEARNERSGROUP,
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
