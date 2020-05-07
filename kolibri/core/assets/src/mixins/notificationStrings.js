import { createTranslator } from 'kolibri.utils.i18n';

// TODO add error messages
export default createTranslator('NotificationStrings', {
  classCreated: {
    message: 'Class created',
    context: 'Adding a class',
  },
  classDeleted: {
    message: 'Class deleted',
    context: 'Deleting a class',
  },
  coachesAssignedNoCount: {
    message: '{count, plural, one {Coach assigned} other {Coaches assigned}}',
    context: 'Assigning coaches to a class',
  },
  coachesRemovedNoCount: {
    message: '{count, plural, one {Coach removed} other {Coaches removed}}',
    context: 'Removing coaches from a class',
  },
  learnersEnrolledNoCount: {
    message: '{count, plural, one {Learner enrolled} other {Learners enrolled}}',
    context: 'Enrolling learners into group or class',
  },
  learnersEnrolledWithCount: {
    message: '{count, number} {count, plural, one {learner enrolled} other {learners enrolled}}',
    context: 'Enrolling learners into group or class',
  },
  learnersRemovedNoCount: {
    message: '{count, plural, one {Learner removed} other {Learners removed}}',
    context: 'Removing (unenrolling) learners from a group or class',
  },
  learnersRemovedWithCount: {
    message: '{count, number} {count, plural, one {learner removed} other {learners removed}}',
    context: 'Removing (unenrolling) learners from a group or class',
  },
  userCreated: {
    message: 'User created',
    context: 'Creating a new user',
  },
  userDeleted: {
    message: 'User deleted',
    context: 'Deleting a user',
  },
  passwordReset: {
    message: 'Password reset',
    context: 'Updating user password',
  },
  changesSaved: {
    message: 'Changes saved',
    context: 'Generic message when something like a lesson, quiz, or user details has been changed',
  },
  lessonCreated: {
    message: 'Lesson created',
    context: 'Creating a new lesson',
  },
  lessonDeleted: {
    message: 'Lesson deleted',
    context: 'Deleting a lesson',
  },
  resourceAdded: {
    message: 'Resource added',
    context: 'Adding a single resource to a lesson',
  },
  resourcesAddedWithCount: {
    message: '{count, number} {count, plural, one {resource added} other {resources added}}',
    context: 'Adding resources to a lesson',
  },
  resourcesRemovedWithCount: {
    message: '{count, number} {count, plural, one {resource removed} other {resources removed}}',
    context: 'Removing resources from a lesson',
  },
  quizCreated: {
    message: 'Quiz created',
    context: 'Creating a new quiz',
  },
  quizDeleted: {
    message: 'Quiz deleted',
    context: 'Deleting a quiz',
  },
  groupCreated: {
    message: 'Group created',
    context: 'Creating a new learner group',
  },
  groupDeleted: {
    message: 'Group deleted',
    context: 'Deleting a learner group',
  },
});
