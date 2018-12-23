import { createTranslator } from 'kolibri.utils.i18n';

/*
  nStrings.$tr('individualFinished', {learnerName, itemName})
  nStrings.$tr('multipleFinished', {learnerName, numOthers, itemName})
  nStrings.$tr('wholeClassroomFinished', {classroomName, itemName})
  nStrings.$tr('wholeLearnerGroupFinished', {itemName})
  nStrings.$tr('individualNeedsHelp', {learnerName, itemName})
  nStrings.$tr('multipleNeedsHelp', {learnerName, numOthers, itemName})
*/

const nStrings = createTranslator('CommonCoachStrings', {
  individualFinished: `{learnerName} finished '{itemName}'`,
  multipleFinished: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} finished '{itemName}'`,
  wholeClassroomFinished: `Everyone in '{classroomName}' finished '{itemName}'`,
  wholeLearnerGroupFinished: `Everyone finished '{itemName}'`,
  individualNeedsHelp: `{learnerName} needs help on '{itemName}'`,
  multipleNeedsHelp: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} need help on '{itemName}'`,
});

const nStringsMixin = {
  computed: {
    nStrings() {
      return nStrings;
    },
  },
};

export { nStrings, nStringsMixin };
