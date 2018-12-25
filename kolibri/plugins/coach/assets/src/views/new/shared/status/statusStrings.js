import { createTranslator } from 'kolibri.utils.i18n';

/*

Strings variations below are defined based on the following constructions:

  Item status: N Object(s) is/are Adjective
  Learner progress: N Learner(s) Verbed one Object

*/

export const Objects = {
  EXERCISE: 'EXERCISE',
  QUIZ: 'QUIZ',
  LESSON: 'LESSON',
  RESOURCE: 'RESOURCE',
};

export const Verbs = {
  COMPLETED: 'COMPLETED',
  DID_NOT_START: 'DID_NOT_START',
  NEED_HELP_WITH: 'NEED_HELP_WITH',
  STARTED: 'STARTED',
};

export const Adjectives = {
  DIFFICULT: 'DIFFICULT',
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  NOT_STARTED: 'NOT_STARTED',
};

const translations = {
  itemStatus: {
    EXERCISE: {
      DIFFICULT: createTranslator('ExerciseStatusDifficult', {
        label: '{count, plural, one {Exercise is difficult} other {Exercises are difficult}}',
        labelShort: '{count, plural, other {Difficult}}',
        count:
          '{count, number, integer} {count, plural, one {exercise is difficult} other {exercises are difficult}}',
        countShort:
          '{count, number, integer} {count, plural, one {is difficult} other {are difficult}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {exercises are difficult}}',
        allOfMoreThanTwoShort:
          'All {count, number, integer} {count, plural, other {are difficult}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {exercise} other {exercises}} {count, plural, one {is difficult} other {are difficult}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, one {is difficult} other {are difficult}}',
      }),
      COMPLETED: createTranslator('ExerciseStatusCompleted', {
        label: '{count, plural, one {Exercise completed} other {Exercises completed}}',
        labelShort: '{count, plural, other {Completed}}',
        count:
          '{count, number, integer} {count, plural, one {exercise completed} other {exercises completed}}',
        countShort: '{count, number, integer} {count, plural, other {completed}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {exercises completed}}',
        allOfMoreThanTwoShort: 'All {count, number, integer} {count, plural, other {completed}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {exercise} other {exercises}} {count, plural, other {completed}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {completed}}',
      }),
      IN_PROGRESS: createTranslator('ExerciseStatusInProgress', {
        label: '{count, plural, one {Exercise in progress} other {Exercises in progress}}',
        labelShort: '{count, plural, other {In progress}}',
        count:
          '{count, number, integer} {count, plural, one {exercise in progress} other {exercises in progress}}',
        countShort: '{count, number, integer} {count, plural, other {in progress}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {exercises in progress}}',
        allOfMoreThanTwoShort: 'All {count, number, integer} {count, plural, other {in progress}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {exercise} other {exercises}} {count, plural, other {in progress}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {in progress}}',
      }),
      NOT_STARTED: createTranslator('ExerciseStatusNotStarted', {
        label: '{count, plural, one {Exercise not started} other {Exercises not started}}',
        labelShort: '{count, plural, other {Not started}}',
        count:
          '{count, number, integer} {count, plural, one {exercise not started} other {exercises not started}}',
        countShort: '{count, number, integer} {count, plural, other {not started}}',
        allOfMoreThanTwo:
          'None of {count, number, integer} {count, plural, other {exercises started}}',
        allOfMoreThanTwoShort: 'None of {count, number, integer} {count, plural, other {started}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {exercise} other {exercises}} {count, plural, other {not started}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {not started}}',
      }),
    },
    LESSON: {
      DIFFICULT: createTranslator('LessonStatusDifficult', {
        label: '{count, plural, one {Lesson is difficult} other {Lessons are difficult}}',
        labelShort: '{count, plural, other {Difficult}}',
        count:
          '{count, number, integer} {count, plural, one {lesson is difficult} other {lessons are difficult}}',
        countShort:
          '{count, number, integer} {count, plural, one {is difficult} other {are difficult}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {lessons are difficult}}',
        allOfMoreThanTwoShort:
          'All {count, number, integer} {count, plural, other {are difficult}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {lesson} other {lessons}} {count, plural, one {is difficult} other {are difficult}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, one {is difficult} other {are difficult}}',
      }),
      COMPLETED: createTranslator('LessonStatusCompleted', {
        label: '{count, plural, one {Lesson completed} other {Lessons completed}}',
        labelShort: '{count, plural, other {Completed}}',
        count:
          '{count, number, integer} {count, plural, one {lesson completed} other {lessons completed}}',
        countShort: '{count, number, integer} {count, plural, other {completed}}',
        allOfMoreThanTwo: 'All {count, number, integer} {count, plural, other {lessons completed}}',
        allOfMoreThanTwoShort: 'All {count, number, integer} {count, plural, other {completed}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {lesson} other {lessons}} {count, plural, other {completed}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {completed}}',
      }),
      IN_PROGRESS: createTranslator('LessonStatusInProgress', {
        label: '{count, plural, one {Lesson in progress} other {Lessons in progress}}',
        labelShort: '{count, plural, other {In progress}}',
        count:
          '{count, number, integer} {count, plural, one {lesson in progress} other {lessons in progress}}',
        countShort: '{count, number, integer} {count, plural, other {in progress}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {lessons in progress}}',
        allOfMoreThanTwoShort: 'All {count, number, integer} {count, plural, other {in progress}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {lesson} other {lessons}} {count, plural, other {in progress}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {in progress}}',
      }),
      NOT_STARTED: createTranslator('LessonStatusNotStarted', {
        label: '{count, plural, one {Lesson not started} other {Lessons not started}}',
        labelShort: '{count, plural, other {Not started}}',
        count:
          '{count, number, integer} {count, plural, one {lesson not started} other {lessons not started}}',
        countShort: '{count, number, integer} {count, plural, other {not started}}',
        allOfMoreThanTwo:
          'None of {count, number, integer} {count, plural, other {lessons started}}',
        allOfMoreThanTwoShort: 'None of {count, number, integer} {count, plural, other {started}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {lesson} other {lessons}} {count, plural, other {not started}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {not started}}',
      }),
    },
    QUIZ: {
      DIFFICULT: createTranslator('QuizStatusDifficult', {
        label: '{count, plural, one {Quiz is difficult} other {Quizzess are difficult}}',
        labelShort: '{count, plural, other {Difficult}}',
        count:
          '{count, number, integer} {count, plural, one {quiz is difficult} other {quizzes are difficult}}',
        countShort:
          '{count, number, integer} {count, plural, one {is difficult} other {are difficult}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {quizzes are difficult}}',
        allOfMoreThanTwoShort:
          'All {count, number, integer} {count, plural, other {are difficult}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {quiz} other {quizzes}} {count, plural, one {is difficult} other {are difficult}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, one {is difficult} other {are difficult}}',
      }),
      COMPLETED: createTranslator('QuizStatusCompleted', {
        label: '{count, plural, one {Quiz completed} other {Quizzess completed}}',
        labelShort: '{count, plural, other {Completed}}',
        count:
          '{count, number, integer} {count, plural, one {quiz completed} other {quizzes completed}}',
        countShort: '{count, number, integer} {count, plural, other {completed}}',
        allOfMoreThanTwo: 'All {count, number, integer} {count, plural, other {quizzes completed}}',
        allOfMoreThanTwoShort: 'All {count, number, integer} {count, plural, other {completed}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {quiz} other {quizzes}} {count, plural, other {completed}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {completed}}',
      }),
      IN_PROGRESS: createTranslator('QuizStatusInProgress', {
        label: '{count, plural, one {Quiz in progress} other {Quizzess in progress}}',
        labelShort: '{count, plural, other {In progress}}',
        count:
          '{count, number, integer} {count, plural, one {quiz in progress} other {quizzes in progress}}',
        countShort: '{count, number, integer} {count, plural, other {in progress}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {quizzes in progress}}',
        allOfMoreThanTwoShort: 'All {count, number, integer} {count, plural, other {in progress}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {quiz} other {quizzes}} {count, plural, other {in progress}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {in progress}}',
      }),
      NOT_STARTED: createTranslator('QuizStatusNotStarted', {
        label: '{count, plural, one {Quiz not started} other {Quizzess not started}}',
        labelShort: '{count, plural, other {Not started}}',
        count:
          '{count, number, integer} {count, plural, one {quiz not started} other {quizzes not started}}',
        countShort: '{count, number, integer} {count, plural, other {not started}}',
        allOfMoreThanTwo:
          'None of {count, number, integer} {count, plural, other {quizzes started}}',
        allOfMoreThanTwoShort: 'None of {count, number, integer} {count, plural, other {started}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {quiz} other {quizzes}} {count, plural, other {not started}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {not started}}',
      }),
    },
    RESOURCE: {
      DIFFICULT: createTranslator('ResourceStatusDifficult', {
        label: '{count, plural, one {Resource is difficult} other {Resources are difficult}}',
        labelShort: '{count, plural, other {Difficult}}',
        count:
          '{count, number, integer} {count, plural, one {resource is difficult} other {resources are difficult}}',
        countShort:
          '{count, number, integer} {count, plural, one {is difficult} other {are difficult}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {resources are difficult}}',
        allOfMoreThanTwoShort:
          'All {count, number, integer} {count, plural, other {are difficult}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {resource} other {resources}} {count, plural, one {is difficult} other {are difficult}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, one {is difficult} other {are difficult}}',
      }),
      COMPLETED: createTranslator('ResourceStatusCompleted', {
        label: '{count, plural, one {Resource completed} other {Resources completed}}',
        labelShort: '{count, plural, other {Completed}}',
        count:
          '{count, number, integer} {count, plural, one {resource completed} other {resources completed}}',
        countShort: '{count, number, integer} {count, plural, other {completed}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {resources completed}}',
        allOfMoreThanTwoShort: 'All {count, number, integer} {count, plural, other {completed}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {resource} other {resources}} {count, plural, other {completed}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {completed}}',
      }),
      IN_PROGRESS: createTranslator('ResourceStatusInProgress', {
        label: '{count, plural, one {Resource in progress} other {Resources in progress}}',
        labelShort: '{count, plural, other {In progress}}',
        count:
          '{count, number, integer} {count, plural, one {resource in progress} other {resources in progress}}',
        countShort: '{count, number, integer} {count, plural, other {in progress}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {resources in progress}}',
        allOfMoreThanTwoShort: 'All {count, number, integer} {count, plural, other {in progress}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {resource} other {resources}} {count, plural, other {in progress}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {in progress}}',
      }),
      NOT_STARTED: createTranslator('ResourceStatusNotStarted', {
        label: '{count, plural, one {Resource not started} other {Resources not started}}',
        labelShort: '{count, plural, other {Not started}}',
        count:
          '{count, number, integer} {count, plural, one {resource not started} other {resources not started}}',
        countShort: '{count, number, integer} {count, plural, other {not started}}',
        allOfMoreThanTwo:
          'None of {count, number, integer} {count, plural, other {resources started}}',
        allOfMoreThanTwoShort: 'None of {count, number, integer} {count, plural, other {started}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {resource} other {resources}} {count, plural, other {not started}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {not started}}',
      }),
    },
  },
  learnerProgress: {
    COMPLETED: createTranslator('LearnersCompleted', {
      label: '{count, plural, one {Learner has completed} other {Learners have completed}}',
      labelShort: '{count, plural, other {Completed}}',
      count:
        '{count, plural, other {Completed by}} {count, number, integer} {count, plural, one {learner} other {learners}}',
      countShort: '{count, number, integer} {count, plural, other {completed}}',
      allOfMoreThanTwo:
        'Completed by all {total, number, integer} {total, plural, one {learner} other {learners}}',
      allOfMoreThanTwoShort: 'Completed by all {total, number, integer}',
      ratio:
        '{count, plural, other {Completed by}} {count, number, integer} of {total, number, integer} {total, plural, one {learner} other {learners}}',
      ratioShort:
        '{count, plural, other {Completed by}} {count, number, integer} of {total, number, integer}',
    }),
    DID_NOT_START: createTranslator('LearnersDidNotStart', {
      label: '{count, plural, one {Learner has not started} other {Learners have not started}}',
      labelShort: '{count, plural, one {Has not started} other {Have not started}}',
      count:
        '{count, number, integer} {count, plural, one {learner has not started} other {learners have not started}}',
      countShort:
        '{count, number, integer} {count, plural, one {has not started} other {have not started}}',
      allOfMoreThanTwo:
        'None of {total, number, integer} {total, plural, other {learners}} have started',
      allOfMoreThanTwoShort: 'None of {total, number, integer} have started',
      ratio:
        '{count, number, integer} of {total, number, integer} {total, plural, one {learner} other {learners}} {count, plural, one {has not started} other {have not started}}',
      ratioShort:
        '{count, number, integer} of {total, number, integer} {count, plural, one {has not started} other {have not started}}',
    }),
    NEED_HELP_WITH: createTranslator('LearnersNeedHelp', {
      label: '{count, plural, one {Learner needs help} other {Learners need help}}',
      labelShort: '{count, plural, one {Needs help} other {Need help}}',
      count:
        '{count, number, integer} {count, plural, one {learner needs help} other {learners need help}}',
      countShort: '{count, number, integer} {count, plural, one {needs help} other {need help}}',
      allOfMoreThanTwo: 'All {total, number, integer} learners need help',
      allOfMoreThanTwoShort: 'All {total, number, integer} need help',
      ratio:
        '{count, number, integer} of {total, number, integer} {total, plural, one {learner} other {learners}} {count, plural, one {needs help} other {need help}}',
      ratioShort:
        '{count, number, integer} of {total, number, integer} {count, plural, one {needs help} other {need help}}',
    }),
    STARTED: createTranslator('LearnersStarted', {
      label: '{count, plural, one {Learner has started} other {Learners have started}}',
      labelShort: '{count, plural, other {Started}}',
      count: 'Started by {count, number, integer} {count, plural, one {learner} other {learners}}',
      countShort: '{count, number, integer} {count, plural, other {started}}',
      allOfMoreThanTwo: 'All {total, number, integer} learners have started',
      allOfMoreThanTwoShort: 'All {total, number, integer} have started',
      ratio:
        '{count, number, integer} of {total, number, integer} {total, plural, one {learner} other {learners}} {count, plural, one {has started} other {have started}}',
      ratioShort:
        '{count, number, integer} of {total, number, integer} {count, plural, one {has started} other {have started}}',
    }),
  },
};

function _shorten(id, isShort) {
  return isShort ? id + 'Short' : id;
}

export function statusLabelString(object, adjective, count, isShort = true) {
  return translations.itemStatus[object][adjective].$tr(_shorten('label', isShort), { count });
}

export function statusCountString(object, adjective, count, isShort = true) {
  return translations.itemStatus[object][adjective].$tr(_shorten('count', isShort), { count });
}

export function statusRatioString(object, adjective, count, total, isShort = true) {
  if (count === total && total > 2) {
    return translations.itemStatus[object][adjective].$tr(_shorten('allOfMoreThanTwo', isShort), {
      count,
    });
  }
  return translations.itemStatus[object][adjective].$tr(_shorten('ratio', isShort), { count });
}

export function progressLabelString(verb, count, isShort = true) {
  return translations.learnerProgress[verb].$tr(_shorten('label', isShort), { count });
}

export function progressCountString(verb, count, isShort = true) {
  return translations.learnerProgress[verb].$tr(_shorten('count', isShort), { count });
}

export function progressRatioString(verb, count, total, isShort = true) {
  if (count === total && total > 2) {
    return translations.learnerProgress[verb].$tr(_shorten('allOfMoreThanTwo', isShort), {
      count,
    });
  }
  return translations.learnerProgress[verb].$tr(_shorten('ratio', isShort), { count });
}

export const statusStringsMixin = {
  computed: {
    statusLabelString() {
      return statusLabelString;
    },
    statusCountString() {
      return statusCountString;
    },
    statusRatioString() {
      return statusRatioString;
    },
    progressLabelString() {
      return progressLabelString;
    },
    progressCountString() {
      return progressCountString;
    },
    progressRatioString() {
      return progressRatioString;
    },
  },
};
