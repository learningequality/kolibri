import { createTranslator } from 'kolibri/utils/i18n';
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
    context: 'Indicates that a learner has started a lesson or resource.',
  },
  individualStartedMissing: {
    message: `{learnerName} started a resource in this lesson`,
    context: 'Indicates that a learner has started a resource but the title cannot be displayed.',
  },
  multipleStarted: {
    message: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} started '{itemName}'`,
    context:
      'Indicates the learner name and how many other learners started a specific lesson or resource.',
  },
  multipleStartedMissing: {
    message: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} started a resource in this lesson`,
    context:
      'Indicates the learner name and how many other learners started a resource but the title cannot be displayed.',
  },
  wholeClassStarted: {
    message: `Everyone started '{itemName}'`,
    context: 'Indicates that every learner in the class started a lesson or resource.',
  },
  wholeClassStartedMissing: {
    message: `Everyone started a resource in this lesson`,
    context:
      'Indicates that every learner in the class started a resource but the title cannot be displayed.',
  },
  wholeGroupStarted: {
    message: `Everyone in '{groupName}' started '{itemName}'`,
    context: 'Indicates that all the learners in a specific group started a lesson or resource.',
  },
  wholeGroupStartedMissing: {
    message: `Everyone in '{groupName}' started a resource in this lesson`,
    context:
      'Indicates that all the learners in a specific group started a resource but the title cannot be displayed.',
  },
  everyoneStarted: {
    message: `Everyone started '{itemName}'`,
    context: 'Indicates that every learner in the group or class started a lesson or resource.',
  },
  everyoneStartedMissing: {
    message: `Everyone started a resource in this lesson`,
    context:
      'Indicates that every learner in the group or class started a resource but the title cannot be displayed.',
  },

  // completed
  individualCompleted: {
    message: `{learnerName} completed '{itemName}'`,
    context: 'Indicates that a learner has completed a lesson or resource.',
  },
  individualCompletedMissing: {
    message: `{learnerName} completed a resource in this lesson`,
    context: 'Indicates that a learner has completed a resource but the title cannot be displayed.',
  },
  multipleCompleted: {
    message: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} completed '{itemName}'`,
    context: 'Indicates a learner and one other or others have completed a lesson or resource.',
  },
  multipleCompletedMissing: {
    message: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} completed a resource in this lesson`,
    context:
      'Indicates a learner and one other or others have completed a resource but the title cannot be displayed.',
  },
  wholeClassCompleted: {
    message: `Everyone completed '{itemName}'`,
    context: 'Indicates that every learner in the class completed a lesson or resource.',
  },
  wholeClassCompletedMissing: {
    message: `Everyone completed a resource in this lesson`,
    context:
      'Indicates that every learner in the class completed a resource but the title cannot be displayed.',
  },
  wholeGroupCompleted: {
    message: `Everyone in '{groupName}' completed '{itemName}'`,
    context: 'Indicates that all the learners in a specific group completed a lesson or resource.',
  },
  wholeGroupCompletedMissing: {
    message: `Everyone in '{groupName}' completed a resource in this lesson`,
    context:
      'Indicates that all the learners in a specific group completed a resource but the title cannot be displayed.',
  },
  everyoneCompleted: {
    message: `Everyone completed '{itemName}'`,
    context: 'Indicates that every learner in the group or class completed a lesson or resource.',
  },
  everyoneCompletedMissing: {
    message: `Everyone completed a resource in this lesson`,
    context:
      'Indicates that every learner in the group or class completed a resource but the title cannot be displayed.',
  },

  // needs help
  individualNeedsHelp: {
    message: `{learnerName} needs help with '{itemName}'`,
    context: 'Indicates that a learner needs help with a specific exercise.',
  },
  individualNeedsHelpMissing: {
    message: `{learnerName} needs help with a resource in this lesson`,
    context: 'Indicates that a learner needs help a resource but the title cannot be displayed.',
  },
  multipleNeedHelp: {
    message: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} need help with '{itemName}'`,
    context: 'Indicates a learner and one other or others need help with a specific exercise.',
  },
  multipleNeedHelpMissing: {
    message: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} need help with a resource in this lesson`,
    context:
      'Indicates a learner and one other or others need help a resource but the title cannot be displayed.',
  },
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
  const stringDetails = {
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

  if (object === RESOURCE && !resource.type.length) {
    stringType += 'Missing';
  }

  return nStrings.$tr(stringType, stringDetails);
}

export { nStrings, nStringsMixin, cardTextForNotification };
