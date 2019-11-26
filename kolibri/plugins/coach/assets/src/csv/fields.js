import at from 'lodash/at';
import pad from 'lodash/padStart';
import coreStringsMixin from 'kolibri.coreVue.mixins.commonCoreStrings';
import { STATUSES } from '../modules/classSummary/constants';
import { VERBS } from '../views/common/status/constants';
import { translations } from '../views/common/status/statusStrings';
import { coachStrings } from '../views/common/commonCoachStrings';

const VERB_MAP = {
  [STATUSES.notStarted]: VERBS.notStarted,
  [STATUSES.started]: VERBS.started,
  [STATUSES.helpNeeded]: VERBS.needHelp,
  [STATUSES.completed]: VERBS.completed,
};
const coreStrings = coreStringsMixin.methods.coreString;

/*
 * Common CSV export fields and formats
 */

/**
 * @param {String|Number} interval
 * @return {string}
 */
function padTime(interval) {
  return pad(interval, 2, '0');
}

export function avgScore(quiz = false) {
  return [
    {
      name: coachStrings.$tr(quiz ? 'avgQuizScoreLabel' : 'avgScoreLabel'),
      key: 'avgScore',
      format(row) {
        if (!row.avgScore) {
          return '';
        }

        return coachStrings.$tr('percentage', { value: row.avgScore });
      },
    },
  ];
}

export function helpNeeded() {
  return [
    {
      name: coachStrings.$tr('helpNeededLabel'),
      key: 'helpNeeded',
      format: row => row.total - row.correct,
    },
  ];
}

export function lastActivity() {
  return [
    {
      name: coachStrings.$tr('lastActivityLabel'),
      key: 'lastActivity',
    },
  ];
}

export function learnerProgress(key = 'status') {
  return [
    {
      name: coreStrings('progressLabel'),
      key,
      format(row) {
        const [value] = at(row, key);
        const strings = translations.learnerProgress[VERB_MAP[value]];
        return strings.$tr('labelShort', { count: 1 });
      },
    },
  ];
}

export function list(key, label) {
  return [
    {
      name: coachStrings.$tr(label),
      key,
      format(row) {
        const [value] = at(row, key);

        if (value && value.length) {
          return value.join(', '); // TODO: Internationalize
        }

        return '';
      },
    },
  ];
}

export function name(label = 'nameLabel') {
  return [
    {
      name: coachStrings.$tr(label),
      key: 'name',
    },
  ];
}

export function recipients() {
  return [
    {
      name: coachStrings.$tr('recipientsLabel'), // TODO: Add new string for this
      key: 'recipientType',
      format(row) {
        if ('groupNames' in row && row.groupNames.length) {
          return coachStrings.$tr('groupsLabel');
        }

        if ('hasAssignments' in row && row.hasAssignments) {
          return coachStrings.$tr('classLabel');
        }

        return '';
      },
    },
    ...list('groupNames', 'recipientsLabel'),
  ];
}

export function score() {
  return [
    {
      name: coachStrings.$tr('scoreLabel'),
      key: 'score',
      format: row => {
        if (!row.statusObj.score) {
          return '';
        }

        return coachStrings.$tr('percentage', { value: row.statusObj.score });
      },
    },
  ];
}

export function tally() {
  return [
    {
      name: coachStrings.$tr('startedLabel'),
      key: 'tally.started',
    },
    {
      name: coreStrings('completedLabel'),
      key: 'tally.completed',
    },
    {
      name: coachStrings.$tr('helpNeededLabel'),
      key: 'tally.helpNeeded',
    },
    {
      name: coreStrings('allLabel'), // TODO: Add new string for this
      key: 'all',
      format(row) {
        return Object.values(row.tally).reduce((sum, val) => sum + val, 0);
      },
    },
  ];
}

export function timeSpent(key, label = 'timeSpentLabel') {
  return [
    {
      name: coachStrings.$tr(label),
      key,
      format(row) {
        const [value] = at(row, key);
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

export function title() {
  return [
    {
      name: coachStrings.$tr('titleLabel'),
      key: 'title',
    },
  ];
}
