import { createTranslator } from 'kolibri.utils.i18n';
import { CollectionTypes } from '../../../constants/lessonsConstants';
import { NotificationEvents, NotificationObjects } from '../../../constants/notificationsConstants';

const { LESSON, RESOURCE, QUIZ } = NotificationObjects;
const { COMPLETED, STARTED, HELP_NEEDED } = NotificationEvents;

/*
  nStrings.$tr('individualFinished', {learnerName, itemName})
  nStrings.$tr('multipleFinished', {learnerName, numOthers, itemName})
  nStrings.$tr('wholeClassFinished', {className, itemName})
  nStrings.$tr('wholeGroupFinished', {groupName, itemName})
  nStrings.$tr('everyoneFinished', {itemName})
  nStrings.$tr('individualNeedsHelp', {learnerName, itemName})
  nStrings.$tr('multipleNeedHelp', {learnerName, numOthers, itemName})
*/

const nStrings = createTranslator('NotificationStrings', {
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
    cardTextForNotification() {
      return cardTextForNotification;
    },
  },
};

function cardTextForNotification(notification) {
  const { collection, resource, learnerSummary, object, event } = notification;
  let stringType;
  let stringDetails = {
    learnerName: learnerSummary.firstUserName,
  };

  if (object === RESOURCE) {
    stringDetails.itemName = resource.name;
  }

  if (object === LESSON || object === QUIZ) {
    stringDetails.itemName = notification.assignment.name;
  }

  if (event === COMPLETED || event === STARTED) {
    if (learnerSummary.completesCollection) {
      if (collection.type === CollectionTypes.CLASSROOM) {
        // When concatenated, should match the keys in 'nStrings' (e.g. 'wholeClassCompleted')
        stringType = `wholeClass${event}`;
        stringDetails.className = collection.name;
      } else {
        stringType = `wholeGroup${event}`;
        stringDetails.groupName = collection.name;
      }
    } else {
      if (learnerSummary.total === 1) {
        stringType = `individual${event}`;
      } else {
        stringType = `multiple${event}`;
        stringDetails.numOthers = learnerSummary.total - 1;
      }
    }
  }

  if (event === HELP_NEEDED) {
    if (learnerSummary.total === 1) {
      stringType = 'individualNeedsHelp';
    } else {
      stringType = 'multipleNeedHelp';
      stringDetails.numOthers = learnerSummary.total - 1;
    }
  }

  return nStrings.$tr(stringType, stringDetails);
}

export { nStrings, nStringsMixin, cardTextForNotification };
