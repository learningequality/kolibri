import at from 'lodash/at';
import pad from 'lodash/padStart';
import get from 'lodash/get';
import { crossComponentTranslator, createTranslator, formatList } from 'kolibri.utils.i18n';
import PageStatus from 'kolibri.coreVue.components.PageStatus';
import coreStringsMixin from 'kolibri.coreVue.mixins.commonCoreStrings';
import { STATUSES } from '../modules/classSummary/constants';
import { VERBS } from '../views/common/status/constants';
import { translations } from '../views/common/status/statusStrings';
import { coachStrings } from '../views/common/commonCoachStrings';

const FieldsMixinStrings = createTranslator('FieldsMixinStrings', {
  allLearners: 'All learners',
  recipientType: 'Recipient type',
  groupsAndIndividuals: 'Groups and individuals',
  wholeClass: 'Whole class',
});

const VERB_MAP = {
  [STATUSES.notStarted]: VERBS.notStarted,
  [STATUSES.started]: VERBS.started,
  [STATUSES.helpNeeded]: VERBS.needHelp,
  [STATUSES.completed]: VERBS.completed,
};
const coreStrings = coreStringsMixin.methods.coreString;
const examStrings = crossComponentTranslator(PageStatus);

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
        if (!row.avgScore && row.avgScore !== 0) {
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
    {
      name: FieldsMixinStrings.$tr('allLearners'),
      key: 'all',
      format: row => row.total,
    },
  ];
}

export function lastActivity() {
  return [
    {
      name: coachStrings.$tr('lastActivityLabel'),
      key: 'lastActivity',
      format(row) {
        if (!row[this.key]) {
          return '';
        }

        return row[this.key].toISOString();
      },
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
          return formatList(value);
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
          const numGroups = get(row, 'groupNames.length', -1);
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

export function score() {
  return [
    {
      name: coachStrings.$tr('scoreLabel'),
      key: 'score',
      format: row => {
        if (!row.statusObj.score && row.statusObj.score !== 0) {
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
      name: examStrings.$tr('notStartedLabel'),
      key: 'tally.notStarted',
    },
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
