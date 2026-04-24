import pad from 'lodash/padStart';
import get from 'lodash/get';
import { createTranslator, formatList } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { STATUSES } from '../modules/classSummary/constants';
import { VERBS } from '../views/common/status/constants';
import { learnerProgressTranslators } from '../views/common/status/statusStrings';
import { coachStrings } from '../views/common/commonCoachStrings';

const FieldsMixinStrings = createTranslator('FieldsMixinStrings', {
  allLearners: {
    message: 'All learners',
    context: 'Link that takes coach back to the learners list view.',
  },
  recipientType: {
    message: 'Assigned to',
    context: 'Column header for the quiz report exported as CSV',
  },
  individualLearners: {
    message: 'Individual learners',
    context:
      'One of the options in the quiz report exported as CSV indicating that a quiz or a lesson has been assigned to individual learners.',
  },
  groupsAndIndividuals: {
    message: 'Both individual learners and groups',
    context:
      'One of the options in the quiz report exported as CSV indicating that a quiz or a lesson has been assigned to both individual learners and groups.',
  },
  wholeClass: {
    message: 'Whole class',
    context: 'Column header for the quiz report exported as CSV. Refers to the entire class.',
  },
  questionsCorrect: {
    message: 'Questions answered correctly',
    context: 'Column header for the quiz report exported as CSV',
  },
  questionsTotal: {
    message: 'Total questions',
    context: 'Column header for the quiz report exported as CSV.',
  },
  questionsAnswered: {
    message: 'Answered questions',
    context: 'Column header for the quiz report exported as CSV.',
  },
});

const VERB_MAP = {
  [STATUSES.notStarted]: VERBS.notStarted,
  [STATUSES.started]: VERBS.started,
  [STATUSES.helpNeeded]: VERBS.needHelp,
  [STATUSES.completed]: VERBS.completed,
};

/*
 * Common CSV export fields and formats
 */

/**
 * Pads a time interval value with leading zeros to at least 2 digits.
 * @param {number|string} interval - The time value to pad.
 * @returns {string} The zero-padded string.
 */
function padTime(interval) {
  return pad(interval, 2, '0');
}

/**
 * Returns CSV field definition for the average score column.
 * @returns {Array} Array of CSV field definition objects.
 */
export function avgScore() {
  return [
    {
      name: coachStrings.$tr('avgScoreLabel'),
      key: 'avgScore',
      format(row) {
        if (!row.avgScore && row.avgScore !== 0) {
          return '';
        }

        return coreStrings.$formatNumber(row.avgScore, { style: 'percent' });
      },
    },
  ];
}

/**
 * Returns CSV field definitions for help needed and total learner counts.
 * @returns {Array} Array of CSV field definition objects.
 */
export function helpNeeded() {
  return [
    {
      name: coachStrings.$tr('helpNeededLabel'),
      key: 'helpNeeded',
      format: row => row.total - row.correct,
    },
    {
      name: FieldsMixinStrings.$tr('allLearners'),
      key: 'all',
      format: row => row.total,
    },
  ];
}

/**
 * Returns CSV field definition for the all learners count column.
 * @param {string} key - The row property key to read the value from.
 * @returns {Array} Array of CSV field definition objects.
 */
export function allLearners(key = 'all') {
  return [
    {
      name: FieldsMixinStrings.$tr('allLearners'),
      key,
      format: row => get(row, key) || '',
    },
  ];
}

/**
 * Returns CSV field definition for the last activity date column.
 * @param {string} key - The row property key to read the date value from.
 * @returns {Array} Array of CSV field definition objects.
 */
export function lastActivity(key = 'lastActivity') {
  return [
    {
      name: coachStrings.$tr('lastActivityLabel'),
      key,
      format(row) {
        const value = get(row, key);

        if (!value) {
          return '';
        }

        return value.toISOString();
      },
    },
  ];
}

/**
 * Returns CSV field definition for the learner progress status column.
 * @param {string} key - The row property key to read the status value from.
 * @returns {Array} Array of CSV field definition objects.
 */
export function learnerProgress(key = 'status') {
  return [
    {
      name: coreStrings.$tr('progressLabel'),
      key,
      format(row) {
        const value = get(row, key);
        const strings = learnerProgressTranslators[VERB_MAP[value]];
        return strings.$tr('labelShort', { count: 1 });
      },
    },
  ];
}

/**
 * Returns CSV field definition for a column that displays a formatted list of values.
 * @param {string} key - The row property key to read the list value from.
 * @param {string} label - The translation key from coachStrings for the column header.
 * @returns {Array} Array of CSV field definition objects.
 */
export function list(key, label) {
  return [
    {
      name: coachStrings.$tr(label),
      key,
      format(row) {
        const value = get(row, key);

        if (value && value.length) {
          return formatList(value);
        }

        return '';
      },
    },
  ];
}

/**
 * Returns CSV field definition for the name column.
 * @param {string} label - The translation key from coachStrings for the column header.
 * @returns {Array} Array of CSV field definition objects.
 */
export function name(label = 'nameLabel') {
  return [
    {
      name: coachStrings.$tr(label),
      key: 'name',
    },
  ];
}

/**
 * Returns CSV field definitions for the recipient type and recipient names columns.
 * @param {string} className - Class name shown when the assignment targets the whole class.
 * @returns {Array} Array of CSV field definition objects.
 */
export function recipients(className) {
  return [
    {
      name: FieldsMixinStrings.$tr('recipientType'),
      key: 'recipientType',
      format(row) {
        const { recipientNames = [] } = row;
        if (recipientNames.length === 0 && row.hasAssignments) {
          return FieldsMixinStrings.$tr('wholeClass');
        } else {
          const numGroups = get(row, 'groupNames.length', 0);
          if (!numGroups) {
            return FieldsMixinStrings.$tr('individualLearners');
          }
          // If there are more recipients than groups, then there must be some individual learners
          return recipientNames.length > numGroups
            ? FieldsMixinStrings.$tr('groupsAndIndividuals') // At least one individual recipient
            : coachStrings.$tr('groupsLabel'); // Groups only
        }
      },
    },
    {
      name: coachStrings.$tr('recipientsLabel'),
      key: 'groupNames',
      format(row) {
        const { recipientNames = [] } = row;
        if (recipientNames.length === 0 && row.hasAssignments) {
          return className || FieldsMixinStrings.$tr('wholeClass');
        } else {
          return formatList(recipientNames);
        }
      },
    },
  ];
}

/**
 * Returns CSV field definition for the individual learner score column.
 * @returns {Array} Array of CSV field definition objects.
 */
export function score() {
  return [
    {
      name: coreStrings.$tr('scoreLabel'),
      key: 'score',
      format: row => {
        if (!row.statusObj.score && row.statusObj.score !== 0) {
          return '';
        }

        return coreStrings.$formatNumber(row.statusObj.score, { style: 'percent' });
      },
    },
  ];
}

/**
 * Returns CSV field definitions for the completion tally (not started, started, completed, etc.).
 * @returns {Array} Array of CSV field definition objects.
 */
export function tally() {
  return [
    {
      name: coreStrings.$tr('notStartedLabel'),
      key: 'tally.notStarted',
    },
    {
      name: coachStrings.$tr('startedLabel'),
      key: 'tally.started',
    },
    {
      name: coreStrings.$tr('completedLabel'),
      key: 'tally.completed',
    },
    {
      name: coachStrings.$tr('helpNeededLabel'),
      key: 'tally.helpNeeded',
    },
  ];
}

/**
 * Returns CSV field definition for the time spent column, formatted as HH:MM:SS.
 * @param {string} key - The row property key to read the time value from.
 * @param {string} label - Optional column header label; defaults to the core time spent label.
 * @returns {Array} Array of CSV field definition objects.
 */
export function timeSpent(key, label) {
  label = label || coreStrings.$tr('timeSpentLabel');
  return [
    {
      name: label,
      key,
      format(row) {
        const value = get(row, key);
        const timeSpent = parseInt(value, 10);

        if (!timeSpent) {
          return '';
        }

        const hours = Math.floor(timeSpent / 3600);
        const minutes = Math.floor((timeSpent - hours * 3600) / 60);
        const seconds = timeSpent - hours * 3600 - minutes * 60;

        return `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
      },
    },
  ];
}

/**
 * Returns CSV field definition for the title column.
 * @returns {Array} Array of CSV field definition objects.
 */
export function title() {
  return [
    {
      name: coachStrings.$tr('titleLabel'),
      key: 'title',
    },
  ];
}

/**
 * Returns CSV field definition for the question title column.
 * @returns {Array} Array of CSV field definition objects.
 */
export function questionTitle() {
  return [
    {
      name: coachStrings.$tr('titleLabel'),
      key: 'title',
    },
  ];
}

/**
 * Returns CSV field definitions for quiz questions answered, correct, and total columns.
 * @param {object} quiz - The quiz object containing question_count.
 * @returns {Array} Array of CSV field definition objects.
 */
export function quizQuestionsAnswered(quiz) {
  return [
    {
      name: FieldsMixinStrings.$tr('questionsAnswered'),
      key: 'quizQuestionsAnswered',
      format(row) {
        return get(row, 'statusObj.num_answered');
      },
    },
    {
      name: FieldsMixinStrings.$tr('questionsCorrect'),
      key: 'quizQuestionsAnswered',
      format(row) {
        return get(row, 'statusObj.num_correct');
      },
    },
    {
      name: FieldsMixinStrings.$tr('questionsTotal'),
      key: 'quizQuestionsTotal',
      format() {
        return quiz.question_count;
      },
    },
  ];
}
