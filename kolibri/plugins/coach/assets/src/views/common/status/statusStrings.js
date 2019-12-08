import { createTranslator } from 'kolibri.utils.i18n';
import logger from 'kolibri.lib.logging';

import { OBJECTS, ADJECTIVES, VERBS } from './constants';

export const logging = logger.getLogger(__filename);

/*

Strings variations below are defined based on the following constructions:

  Item status: N Object(s) is/are Adjective
  Learner progress: N Learner(s) Verbed one Object

*/

export const translations = {
  itemStatus: {
    exercise: {
      difficult: createTranslator('ExerciseStatusDifficult', {
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
      completed: createTranslator('ExerciseStatusCompleted', {
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
      inProgress: createTranslator('ExerciseStatusInProgress', {
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
      notStarted: createTranslator('ExerciseStatusNotStarted', {
        label: '{count, plural, one {Exercise not started} other {Exercises not started}}',
        labelShort: '{count, plural, other {Not started}}',
        count:
          '{count, number, integer} {count, plural, one {exercise not started} other {exercises not started}}',
        countShort: '{count, number, integer} {count, plural, other {not started}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {exercise} other {exercises}} {count, plural, other {not started}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {not started}}',
      }),
    },
    lesson: {
      difficult: createTranslator('LessonStatusDifficult', {
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
      completed: createTranslator('LessonStatusCompleted', {
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
      inProgress: createTranslator('LessonStatusInProgress', {
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
      notStarted: createTranslator('LessonStatusNotStarted', {
        label: '{count, plural, one {Lesson not started} other {Lessons not started}}',
        labelShort: '{count, plural, other {Not started}}',
        count:
          '{count, number, integer} {count, plural, one {lesson not started} other {lessons not started}}',
        countShort: '{count, number, integer} {count, plural, other {not started}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {lesson} other {lessons}} {count, plural, other {not started}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {not started}}',
      }),
    },
    question: {
      difficult: createTranslator('QuestionStatusDifficult', {
        label: '{count, plural, one {Question is difficult} other {Questions are difficult}}',
        labelShort: '{count, plural, other {Difficult}}',
        count:
          '{count, number, integer} {count, plural, one {question is difficult} other {questions are difficult}}',
        countShort:
          '{count, number, integer} {count, plural, one {is difficult} other {are difficult}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {questions are difficult}}',
        allOfMoreThanTwoShort:
          'All {count, number, integer} {count, plural, other {are difficult}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {question} other {questions}} {count, plural, one {is difficult} other {are difficult}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, one {is difficult} other {are difficult}}',
      }),
      completed: createTranslator('QuestionStatusCompleted', {
        label: '{count, plural, one {Question completed} other {Questions completed}}',
        labelShort: '{count, plural, other {Completed}}',
        count:
          '{count, number, integer} {count, plural, one {question completed} other {questions completed}}',
        countShort: '{count, number, integer} {count, plural, other {completed}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {questions completed}}',
        allOfMoreThanTwoShort: 'All {count, number, integer} {count, plural, other {completed}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {question} other {questions}} {count, plural, other {completed}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {completed}}',
      }),
      inProgress: createTranslator('QuestionStatusInProgress', {
        label: '{count, plural, one {Question in progress} other {Questions in progress}}',
        labelShort: '{count, plural, other {In progress}}',
        count:
          '{count, number, integer} {count, plural, one {question in progress} other {questions in progress}}',
        countShort: '{count, number, integer} {count, plural, other {in progress}}',
        allOfMoreThanTwo:
          'All {count, number, integer} {count, plural, other {questions in progress}}',
        allOfMoreThanTwoShort: 'All {count, number, integer} {count, plural, other {in progress}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {question} other {questions}} {count, plural, other {in progress}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {in progress}}',
      }),
      notStarted: createTranslator('QuestionStatusNotStarted', {
        label: '{count, plural, one {Question not started} other {Questions not started}}',
        labelShort: '{count, plural, other {Not started}}',
        count:
          '{count, number, integer} {count, plural, one {question not started} other {questions not started}}',
        countShort: '{count, number, integer} {count, plural, other {not started}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {question} other {questions}} {count, plural, other {not started}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {not started}}',
      }),
    },
    quiz: {
      difficult: createTranslator('QuizStatusDifficult', {
        label: '{count, plural, one {Quiz is difficult} other {Quizzes are difficult}}',
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
      completed: createTranslator('QuizStatusCompleted', {
        label: '{count, plural, one {Quiz completed} other {Quizzes completed}}',
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
      inProgress: createTranslator('QuizStatusInProgress', {
        label: '{count, plural, one {Quiz in progress} other {Quizzes in progress}}',
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
      notStarted: createTranslator('QuizStatusNotStarted', {
        label: '{count, plural, one {Quiz not started} other {Quizzes not started}}',
        labelShort: '{count, plural, other {Not started}}',
        count:
          '{count, number, integer} {count, plural, one {quiz not started} other {quizzes not started}}',
        countShort: '{count, number, integer} {count, plural, other {not started}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {quiz} other {quizzes}} {count, plural, other {not started}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {not started}}',
      }),
    },
    resource: {
      difficult: createTranslator('ResourceStatusDifficult', {
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
      completed: createTranslator('ResourceStatusCompleted', {
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
      inProgress: createTranslator('ResourceStatusInProgress', {
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
      notStarted: createTranslator('ResourceStatusNotStarted', {
        label: '{count, plural, one {Resource not started} other {Resources not started}}',
        labelShort: '{count, plural, other {Not started}}',
        count:
          '{count, number, integer} {count, plural, one {resource not started} other {resources not started}}',
        countShort: '{count, number, integer} {count, plural, other {not started}}',
        ratio:
          '{count, number, integer} of {total, number, integer} {total, plural, one {resource} other {resources}} {count, plural, other {not started}}',
        ratioShort:
          '{count, number, integer} of {total, number, integer} {count, plural, other {not started}}',
      }),
    },
  },
  learnerProgress: {
    completed: createTranslator('LearnersCompleted', {
      label: '{count, plural, one {Completed by learner} other {Completed by learners}}',
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
    notStarted: createTranslator('LearnersDidNotStart', {
      label: '{count, plural, one {Learner has not started} other {Learners have not started}}',
      labelShort: '{count, plural, one {Has not started} other {Have not started}}',
      count:
        '{count, number, integer} {count, plural, one {learner has not started} other {learners have not started}}',
      countShort:
        '{count, number, integer} {count, plural, one {has not started} other {have not started}}',
      ratio:
        '{count, number, integer} of {total, number, integer} {total, plural, one {learner} other {learners}} {count, plural, one {has not started} other {have not started}}',
      ratioShort:
        '{count, number, integer} of {total, number, integer} {count, plural, one {has not started} other {have not started}}',
    }),
    needHelp: createTranslator('LearnersNeedHelp', {
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
    started: createTranslator('LearnersStarted', {
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
      questionsStarted: '{answeredQuestionsCount} of {totalQuestionsCount} answered',
    }),
  },
};

export function isValidObject(value) {
  const output = Boolean(OBJECTS[value]);
  if (!output) {
    logging.error(`'${value}' must be one of: ${Object.values(OBJECTS)}`);
  }
  return output;
}

export function isValidAdjective(value) {
  const output = Boolean(ADJECTIVES[value]);
  if (!output) {
    logging.error(`'${value}' must be one of: ${Object.values(ADJECTIVES)}`);
  }
  return output;
}

export function isValidVerb(value) {
  const output = Boolean(VERBS[value]);
  if (!output) {
    logging.error(`'${value}' must be one of: ${Object.values(VERBS)}`);
  }
  return output;
}

export const statusStringsMixin = {
  props: {
    count: {
      type: Number,
      required: true,
      validator(value) {
        const output = value >= 0;
        if (!output) {
          logging.error(`'${value}' must be greater than 0`);
        }
        return output;
      },
    },
    verbosity: {
      type: [Number, String],
      required: true,
      validator(value) {
        const output = [0, 1, 2].includes(Number(value));
        if (!output) {
          logging.error(`'${value}' must be one of: ${[0, 1, 2]}`);
        }
        return output;
      },
    },
    total: {
      type: Number,
      required: false,
      validator(value) {
        const output = value >= 0;
        if (!output) {
          logging.error(`'${value}' must be greater than 0`);
        }
        return output;
      },
    },
  },
  methods: {
    shorten(id, verbosity) {
      return verbosity === 1 ? id + 'Short' : id;
    },
  },
  computed: {
    verbosityNumber() {
      return Number(this.verbosity);
    },
    translations() {
      return translations;
    },
  },
};
