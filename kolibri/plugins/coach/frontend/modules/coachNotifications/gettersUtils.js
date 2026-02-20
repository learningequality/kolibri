import find from 'lodash/find';
import { CollectionTypes } from '../../constants/lessonsConstants';
import { PageNames } from '../../constants';

// Just makes an params object that should work with all the paths.
// It has extra params that may not be used by some routes.
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
    tryIndex: 0,
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
    value: PageNames.GROUP_LESSON_EXERCISE_LEARNER_REPORT,
  },
  {
    key: {
      object: 'Lesson',
      isMultiple: true,
      isWholeClass: false,
    },
    value: PageNames.GROUP_LESSON_SUMMARY,
  },
  {
    key: {
      object: 'Quiz',
      isMultiple: true,
      isWholeClass: false,
    },
    value: PageNames.GROUP_EXAM_SUMMARY,
  },
  {
    key: {
      object: 'Exercise',
      isMultiple: true,
      isWholeClass: true,
    },
    value: PageNames.LESSON_EXERCISE_LEARNERS_REPORT,
  },
  {
    key: {
      object: 'NonExercise',
      isMultiple: true,
      isWholeClass: true,
    },
    value: PageNames.LESSON_RESOURCE_LEARNERS_REPORT,
  },
  {
    key: {
      object: 'Lesson',
      isMultiple: true,
      isWholeClass: true,
    },
    value: PageNames.LESSON_SUMMARY,
  },
  {
    key: {
      object: 'Quiz',
      isMultiple: true,
      isWholeClass: true,
    },
    value: PageNames.EXAM_SUMMARY,
  },
  {
    key: {
      object: 'Lesson',
      isMultiple: false,
      isWholeClass: false,
    },
    value: PageNames.LEARNER_LESSON_REPORT,
  },
  {
    key: {
      object: 'Quiz',
      isMultiple: false,
      isWholeClass: false,
    },
    value: PageNames.QUIZ_LEARNER_PAGE_ROOT,
  },
  {
    key: {
      object: 'Exercise',
      isMultiple: false,
      isWholeClass: true,
    },
    value: PageNames.LESSON_EXERCISE_LEARNER_PAGE_ROOT,
  },
  {
    key: {
      object: 'Lesson',
      isMultiple: false,
      isWholeClass: true,
    },
    value: PageNames.LEARNER_LESSON_REPORT,
  },
  {
    key: {
      object: 'Quiz',
      isMultiple: false,
      isWholeClass: true,
    },
    value: PageNames.QUIZ_LEARNER_PAGE_ROOT,
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
