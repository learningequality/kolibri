import { createTranslator } from 'kolibri/utils/i18n';
import logger from 'kolibri-logging';

import { VERBS } from './constants';

export const logging = logger.getLogger(__filename);

/*
Strings variations below are defined based on the following construction:
  "N Learner(s) Verbed one Object"
*/

export const learnerProgressTranslators = {
  completed: createTranslator('LearnersCompleted', {
    label: {
      message: '{count, plural, one {Completed by learner} other {Completed by learners}}',
      context: 'Label that refers to a learner or learners who completed an activity.',
    },
    labelShort: {
      message: '{count, plural, other {Completed}}',
      context: 'Refers to learners:\n1 (learner) completed\n4 (learners) completed',
    },
    count: {
      message:
        '{count, plural, other {Completed by}} {count, number, integer} {count, plural, one {learner} other {learners}}',

      context:
        "Refers to the number of learners that completed an activity. For example:\n\n'Completed by 10 learners'",
    },
    countShort: {
      message: '{count, number, integer} {count, plural, other {completed}}',
      context: 'Refers to number of learners that completed a activity\n',
    },
    allOfMoreThanTwo: {
      message:
        'Completed by all {total, number, integer} {total, plural, one {learner} other {learners}}',

      context:
        "Indicates an activity has been completed by all of the learners in that class or group. For example:\n\n'Completed by all 10 learners'",
    },
    allOfMoreThanTwoShort: {
      message: 'Completed by all {total, number, integer}',
      context:
        "Indicates an activity has been completed by all of the learners in that class or group. For example:\n\n'Completed by all 10 (learners)' (short version)",
    },
    ratio: {
      message:
        '{count, plural, other {Completed by}} {count, number, integer} of {total, number, integer} {total, plural, one {learner} other {learners}}',

      context:
        "Refers to an activity being completed by a number of learners out of the total number of learners doing that activity. For example:\n\n'Completed by 5 of 8 learners'",
    },
    ratioShort: {
      message:
        '{count, plural, other {Completed by}} {count, number, integer} of {total, number, integer}',
      context:
        "Refers to an activity being completed by a number of learners out of the total number of learners doing that activity. For example:\n\n'Completed by 3 of 6'. (short version)",
    },
  }),
  notStarted: createTranslator('LearnersDidNotStart', {
    label: {
      message: '{count, plural, one {Learner has not started} other {Learners have not started}}',
      context: "Label that refers to a learner or learners who haven't started an activity.",
    },
    labelShort: {
      message: '{count, plural, one {Has not started} other {Have not started}}',
      context:
        "Label that refers to a learner or learners who haven't started an activity. (short version)\n\nOnly translate 'Has not started' and 'Have not started'.",
    },
    count: {
      message:
        '{count, number, integer} {count, plural, one {learner has not started} other {learners have not started}}',
      context:
        "Refers to the number of learners who haven't started an activity. For example:\n\n'2 learners have not started'",
    },
    countShort: {
      message:
        '{count, number, integer} {count, plural, one {has not started} other {have not started}}',
      context:
        "Refers to the number of learners who haven't started an activity. For example:\n\n'7 have not started' (short version)",
    },
    ratio: {
      message:
        '{count, number, integer} of {total, number, integer} {total, plural, one {learner} other {learners}} {count, plural, one {has not started} other {have not started}}',
      context:
        "Refers to the number of learners who haven't started an activity out of a total number of learners. For example:\n\n'5 of 8 learners have not started'\n",
    },
    ratioShort: {
      message:
        '{count, number, integer} of {total, number, integer} {count, plural, one {has not started} other {have not started}}',
      context:
        "Refers to the number of learners who haven't started an activity out of a total number of learners. For example:\n\n'5 of 8 have not started' (short version)",
    },
  }),
  needHelp: createTranslator('LearnersNeedHelp', {
    label: {
      message: '{count, plural, one {Learner needs help} other {Learners need help}}',
      context: 'Label indicating that a learner or learners doing an activity need help.',
    },
    labelShort: {
      message: '{count, plural, one {Needs help} other {Need help}}',
      context:
        "Label indicating that a learner or learners doing an activity need help. (short version)\n\nOnly translate 'Needs help' and 'Need help'",
    },
    count: {
      message:
        '{count, number, integer} {count, plural, one {learner needs help} other {learners need help}}',
      context:
        "Indicates that a specified number of learners doing an activity need help. For example:\n\n'6 learners need help'.\n",
    },
    countShort: {
      message: '{count, number, integer} {count, plural, one {needs help} other {need help}}',
      context:
        "Indicates that a specified number of learners doing an activity need help. For example:\n\n'6 (learners) need help'. (short version)",
    },
    allOfMoreThanTwo: {
      message: 'All {total, number, integer} learners need help',
      context: 'Indicates that all learners doing a specific activity need help.',
    },
    allOfMoreThanTwoShort: {
      message: 'All {total, number, integer} need help',
      context: 'Indicates that all learners doing a specific activity need help. (short version)',
    },
    ratio: {
      message:
        '{count, number, integer} of {total, number, integer} {total, plural, one {learner} other {learners}} {count, plural, one {needs help} other {need help}}',
      context:
        "Indicates that a specified number of learners doing an activity out of a total number of learners need help. For example:\n\n'6 of 8 learners need help'.",
    },
    ratioShort: {
      message:
        '{count, number, integer} of {total, number, integer} {count, plural, one {needs help} other {need help}}',
      context:
        "Indicates that a specified number of learners doing an activity out of a total number of learners need help. For example:\n\n'6 of 8 (learners) need help'. (short version)",
    },
  }),
  started: createTranslator('LearnersStarted', {
    label: {
      message: '{count, plural, one {Learner has started} other {Learners have started}}',
      context: 'Indicates that a learner or learners have started an activity.',
    },
    labelShort: {
      message: '{count, plural, other {Started}}',
      context:
        "Indicates that a learner or learners have started an activity. (short version)\n\nOnly translate 'Started'.",
    },
    count: {
      message:
        'Started by {count, number, integer} {count, plural, one {learner} other {learners}}',
      context:
        "Indicates that a specified number of learners have started an activity. For example:\n\n'Started by 5 learners'",
    },
    countShort: {
      message: '{count, number, integer} {count, plural, other {started}}',
      context:
        "Indicates that a specified number of learners have started an activity. For example:\n\n'5 (learners) started' (short version)",
    },
    allOfMoreThanTwo: {
      message: 'All {total, number, integer} learners have started',
      context:
        'Indicates when all learners out of the total number possible have started an activity.',
    },
    allOfMoreThanTwoShort: {
      message: 'All {total, number, integer} have started',
      context:
        'Indicates when all learners out of the total number possible have started an activity. (short version)',
    },
    ratio: {
      message:
        '{count, number, integer} of {total, number, integer} {total, plural, one {learner} other {learners}} {count, plural, one {has started} other {have started}}',
      context:
        "Indicates which learners have started an activity. For example:\n\n'John and 1 other have started'",
    },
    ratioShort: {
      message:
        '{count, number, integer} of {total, number, integer} {count, plural, one {has started} other {have started}}',
      context:
        "Indicates how many learners of the total number in the class have started an exercise. For example:\n\n'2 of 5 (learners) have started' (short version)",
    },
    questionsStarted: {
      message: '{answeredQuestionsCount} of {totalQuestionsCount} answered',
      context:
        "Indicates a specified number of questions out of a total number of questions have been answered. For example:\n\n'7 of 10 (questions) answered' (short version)",
    },
  }),
};

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
    learnerProgressTranslators() {
      return learnerProgressTranslators;
    },
  },
};
