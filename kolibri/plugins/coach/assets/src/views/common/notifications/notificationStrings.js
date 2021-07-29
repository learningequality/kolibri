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
  individualStarted: {
    message: `{learnerName} started '{itemName}'`,
    context: 'Indicates that a learner has started a lesson.',
  },
  multipleStarted: {
    message: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} started '{itemName}'`,
    context: 'Indicates the learner name and how many other learners started a specific exercise.',
  },
  wholeClassStarted: {
    message: `Everyone started '{itemName}'`,
    context: 'Indicates that every learner in the class started an activity.',
  },
  wholeGroupStarted: {
    message: `Everyone in '{groupName}' started '{itemName}'`,
    context: 'Indicates that all the learners in a specific group started a lesson.',
  },
  everyoneStarted: {
    message: `Everyone started '{itemName}'`,
    context: 'Indicates that every learner in the group or class started an activity.',
  },

  // completed
  individualCompleted: {
    message: `{learnerName} completed '{itemName}'`,
    context: 'Indicates that a learner has completed an exercise.',
  },
  multipleCompleted: {
    message: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} completed '{itemName}'`,
    context: 'Indicates a learner and one other or others have completed an exercise.',
  },
  wholeClassCompleted: {
    message: `Everyone completed '{itemName}'`,
    context: 'Indicates that every learner in the class completed an activity.',
  },
  wholeGroupCompleted: {
    message: `Everyone in '{groupName}' completed '{itemName}'`,
    context: 'Indicates that all the learners in a specific group completed a lesson.',
  },
  everyoneCompleted: {
    message: `Everyone completed '{itemName}'`,
    context: 'Indicates that every learner in the group or class completed an activity.',
  },

  // needs help
  individualNeedsHelp: {
    message: `{learnerName} needs help with '{itemName}'`,
    context: 'Indicates that a learner needs help with a specific lesson.',
  },
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
    // Don't give complete notices for adhoc learner groups
    if (
      learnerSummary.completesCollection &&
      collection.type !== CollectionTypes.ADHOCLEARNERSGROUP
    ) {
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
