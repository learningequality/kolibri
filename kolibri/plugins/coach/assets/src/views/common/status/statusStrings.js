import { createTranslator } from 'kolibri.utils.i18n';
import logger from 'kolibri.lib.logging';

import { VERBS } from './constants';

export const logging = logger.getLogger(__filename);

/*
Strings variations below are defined based on the following construction:
  "N Learner(s) Verbed one Object"
*/

export const learnerProgressTranslators = {
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
