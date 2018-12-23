import { createTranslator } from 'kolibri.utils.i18n';

/*
  nStrings.$tr('individualFinished', {learnerName, itemName})
  nStrings.$tr('multipleFinished', {learnerName, numOthers, itemName})
  nStrings.$tr('wholeClassFinished', {className, itemName})
  nStrings.$tr('wholeGroupFinished', {groupName, itemName})
  nStrings.$tr('everyoneFinished', {itemName})
  nStrings.$tr('individualNeedsHelp', {learnerName, itemName})
  nStrings.$tr('multipleNeedHelp', {learnerName, numOthers, itemName})
*/

const nStrings = createTranslator('CommonCoachStrings', {
  // started
  individualStarted: `{learnerName} started '{itemName}'`,
  multipleStarted: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} started '{itemName}'`,
  wholeClassStarted: `Everyone in '{className}' started '{itemName}'`,
  wholeGroupStarted: `Everyone in '{groupName}' started '{itemName}'`,
  everyoneStarted: `Everyone started '{itemName}'`,

  // completed
  individualCompleted: `{learnerName} completed '{itemName}'`,
  multipleCompleted: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} completed '{itemName}'`,
  wholeClassCompleted: `Everyone in '{className}' completed '{itemName}'`,
  wholeGroupCompleted: `Everyone in '{groupName}' completed '{itemName}'`,
  everyoneCompleted: `Everyone completed '{itemName}'`,

  // needs help
  individualNeedsHelp: `{learnerName} needs help with '{itemName}'`,
  multipleNeedHelp: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} need help with '{itemName}'`,
});

const nStringsMixin = {
  computed: {
    nStrings() {
      return nStrings;
    },
  },
};

export { nStrings, nStringsMixin };
