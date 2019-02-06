import { createTranslator } from 'kolibri.utils.i18n';

const groupMgmtStrings = createTranslator('GroupManagementStrings', {
  // Actions
  addLearnersAction: 'Add learners',
  manageLearners: 'Manage learners',
  add: 'Add',
  update: 'Update',
  addAndRemove: 'Add',

  // Labels
  addLearnersLabel: "Add learners to '{groupName}'",
  createNewGroupLabel: 'Create new group',
  currentGroups: 'Current groups',
  deleteGroupLabel: 'Delete group',
  removeFromCurrent: 'Remove learners from current groups',
  selectAllToggle: 'Select all',
  selectedLabel: 'Selected',
  selectGroupsLabel: 'Select groups',
  selectLearnersLabel: 'Select learners',
  selectLearnerToggle: 'Select learner',

  // Longer text
  areYouSurePrompt: "Are you sure you want to delete '{ groupName }'?",
  noLearnersDescription: 'There are no learners in this group',

  // notifications
  groupDeletedNotice: 'Group deleted',
  groupCreatedNotice: 'Group ceated',
  addedLearnersNotice:
    'Added {value, number, integer} {value, plural, one {learner} other {learners}}',
  removedLearnersNotice:
    'Removed {value, number, integer} {value, plural, one {learner} other {learners}}',
});

const groupMgmtStringsMixin = {
  computed: {
    groupMgmtStrings() {
      return groupMgmtStrings;
    },
  },
};

export { groupMgmtStrings, groupMgmtStringsMixin };
