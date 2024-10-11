import { createTranslator } from 'kolibri/utils/i18n';

// TODO add error messages
export default createTranslator('NotificationStrings', {
  classCreated: {
    message: 'Class created',
    context: 'A confirmation message indicating that the user has created a class.',
  },
  classDeleted: {
    message: 'Class deleted',
    context: 'A confirmation message indicating that the user has deleted a class.',
  },
  coachesAssignedNoCount: {
    message: '{count, plural, one {Coach assigned} other {Coaches assigned}}',
    context:
      'String appears as a short notification in a bottom left corner of the screen when more than one coach is assigned to a class, but without specifying the number.',
  },
  coachesRemovedNoCount: {
    message: '{count, plural, one {Coach removed} other {Coaches removed}}',
    context: 'Removing an unspecified number of coaches from a class',
  },
  learnersEnrolledNoCount: {
    message: '{count, plural, one {Learner enrolled} other {Learners enrolled}}',
    context: 'Enrolling an unspecified number of learners into group or class',
  },
  learnersRemovedNoCount: {
    message: '{count, plural, one {Learner removed} other {Learners removed}}',
    context: 'Removing (unenrolling) an unspecified number of learners from a group or class',
  },
  learnersEnrolledWithCount: {
    message: '{count, number} {count, plural, one {learner enrolled} other {learners enrolled}}',
    context: 'Enrolling a specified number of learners into group or class',
  },
  learnersRemovedWithCount: {
    message: '{count, number} {count, plural, one {learner removed} other {learners removed}}',
    context: 'Removing (unenrolling) a specified number of learners from a group or class',
  },
  userCreated: {
    message: 'User created',
    context: 'A confirmation message indicating that a new user has been created.\n',
  },
  userDeleted: {
    message: 'User deleted',
    context: 'A confirmation message indicating that an existing user has been deleted.',
  },
  passwordReset: {
    message: 'Password reset',
    context:
      'Text will appear as a notification at the bottom after the user password has been reset',
  },
  changesSaved: {
    message: 'Changes saved',
    context: 'Generic message when something like a lesson, quiz, or user details has been changed',
  },
  lessonCreated: {
    message: 'Lesson created',
    context: 'A confirmation message indicating that the user has created a lesson.',
  },
  lessonCopied: {
    message: 'Lesson copied',
    context: 'A confirmation message indicating that the user has copied a lesson to a class.',
  },
  lessonDeleted: {
    message: 'Lesson deleted',
    context: 'A confirmation message indicating that the user has deleted a lesson.',
  },
  resourcesAddedWithCount: {
    message: '{count, number} {count, plural, one {resource added} other {resources added}}',
    context:
      'Notification that appears when a user adds a specified number of resources to a lesson. For example, "75 resources added".',
  },
  resourcesRemovedWithCount: {
    message: '{count, number} {count, plural, one {resource removed} other {resources removed}}',
    context:
      'Notification that displays when a user removes a specified number of resources from a lesson. For example, "75 resources removed".',
  },
  resourcesAddedNoCount: {
    message: '{count, plural, one {Resource added} other {Resources added}}',
    context: 'Adding an unspecified number of resources to a lesson',
  },
  resourcesRemovedNoCount: {
    message: '{count, plural, one {Resource removed} other {Resources removed}}',
    context: 'Removing an unspecified number of resources from a lesson',
  },
  resourceOrderSaved: {
    message: 'Resource order saved',
    context:
      'A confirmation message indicating that the user has changed the order of the learning resources in a lesson by clicking and dragging them.',
  },
  quizCopied: {
    message: 'Quiz copied',
    context:
      'A confirmation message indicating that the user has copied an existing quiz to a class.',
  },
  quizCreated: {
    message: 'Quiz created',
    context:
      'Text will appear as a notification at the bottom of the screen after a user creates a new quiz.',
  },
  quizDeleted: {
    message: 'Quiz deleted',
    context:
      'NotificationStrings.quizDeleted\n\nA confirmation message indicating that the user has deleted a quiz.',
  },
  groupCreated: {
    message: 'Group created',
    context: 'A confirmation message indicating that the user has created a new group of learners.',
  },
  groupDeleted: {
    message: 'Group deleted',
    context: 'A confirmation message indicating that the user has deleted a new group of learners.',
  },
  pinCreated: {
    message: 'New PIN created',
    context: 'A confirmation message for creating a new a PIN',
  },
  pinUpdated: {
    message: 'PIN updated',
    context: 'A confimation message for updating a PIN',
  },
  pinRemove: {
    message: 'PIN removed',
    context: 'A confirmation message for removing a PIN',
  },
  pinAuthenticate: {
    message: 'PIN authenticated successfully',
    context:
      'A confirmation message indicating that the PIN provided for authentication is correct',
  },
  syncAdded: {
    message: 'Sync schedule added',
    context: 'Snackbar message for adding the sync schedule',
  },
  deviceRemove: {
    message: 'Device removed',
    context: 'Snackbar message when a device is removed from the sync schedule',
  },
  deviceNotRemove: {
    message: 'Device not removed',
    context: 'Snackbar message when a device fails to be removed from he sync schedule',
  },
  newLearningFacilityCreated: {
    message: 'New learning facility created',
    context: 'Snackbar message when a new facility created',
  },
  // TODO move more messages into this namespace:
  // - "Quiz started"
  // - "Quiz Ended"
  // - "Quiz report is not visible to learners"
  // - "Quiz report is visible to learners
  // - "Lesson is visible to learners"
  // - "Lesson is not visible to learners"
});
