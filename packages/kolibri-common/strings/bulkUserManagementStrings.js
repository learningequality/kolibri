import { createTranslator } from 'kolibri/utils/i18n';

export const bulkUserManagementStrings = createTranslator('BulkUserManagementStrings', {
  // Searching and filtering
  newUser: {
    message: 'New user',
    context: 'Button label that lets the user create a new user',
  },
  searchForAUser: {
    message: 'Search for a user',
    context: 'Placeholder text for user search input',
  },
  numUsersSelected: {
    message: '{n, number} {n, plural, one {user} other {users}} selected',
    context: 'A label showing the number of users selected',
  },
  numFilters: {
    message: '{n, number} {n, plural, one {filter} other {filters}}',
    context: 'A label showing the number of filters active',
  },
  createdAt: {
    message: 'Created at',
    context: 'Label for the created at column in the user table.',
  },
  filterLabel: {
    message: 'Filter',
    context: 'Label for the filter dropdown',
  },
  clearFiltersLabel: {
    message: 'Clear filters',
    context: 'Label for the button that clears all filters applied to the user table',
  },
  filterUsersLabel: {
    message: 'Filter users',
    context: 'Label for the filter users side panel',
  },
  allUsersLabel: {
    message: 'All users',
    context: 'Label for the all users filter option',
  },
  selectLabel: {
    message: 'Select',
    context: 'Label for the selecting a user',
  },
  numUsersYouHaveSelected: {
    message: "You've selected {num, number} {num, plural, one {user} other {users}}",
    context: 'Label showing the number of users selected',
  },
  searchForAClass: {
    message: 'Search for a class',
    context: 'Placeholder text for class search input',
  },
  fromLabel: {
    message: 'From',
    context: 'Label for the start date input in the date range filter',
  },
  upToLabel: {
    message: 'Up to',
    context: 'Label for the end date input in the date range filter',
  },
  applyFiltersLabel: {
    message: 'Apply filters',
    context: 'Label for the button that applies the selected filters',
  },
  selectClassesLabel: {
    message: 'Select classes',
    context: 'Heading label for selecting classes in side panels',
  },

  // Date range filters
  lastNDaysLabel: {
    message: 'Last {num, number} days',
    context: 'Label for the last N days date range filter',
  },
  thisMonthLabel: {
    message: 'This month',
    context: 'Label for the this month date range filter',
  },
  lastNMonthsLabel: {
    message: 'Last {num, number} months',
    context: 'Label for the last N months date range filter',
  },
  lastYearLabel: {
    message: 'Last year',
    context: 'Label for the last year date range filter',
  },
  allTimeLabel: {
    message: 'All time',
    context: 'Label for the all time date range filter',
  },

  // Dropdown options
  viewNewUsers: {
    message: 'View new users',
    context: 'Label for dropdown item that links user to page of recently added users',
  },
  viewTrash: {
    message: 'View removed users',
    context: 'Label for dropdown item that links user to trash page of soft-deleted users',
  },
  renameClassLabel: {
    message: 'Rename class',
    context: 'Label for dropdown item that allows user to modify the name of a class',
  },

  // Bulk actions
  enrollToClass: {
    message: 'Enroll to class',
    context:
      'Label for bulk-action button that will allow user to enroll selected learners to classes',
  },
  removeFromClass: {
    message: 'Remove from class',
    context:
      'Label for bulk-action button that will allow user to remove selected learners from classes',
  },
  assignCoach: {
    message: 'Assign coach',
    context:
      'Label for bulk-action button that will allow user to assign selected coaches to classes',
  },
  deleteSelection: {
    message: 'Remove selected users',
    context: 'Label for bulk-action button that will allow user to delete selected users',
  },
  selectAllLabel: {
    message: 'Select all',
    context: 'Label for bulk-action button that will select all users in the current view',
  },
  resetPassword: {
    message: 'Reset password',
    context: 'Label that will allow user to reset passwords for selected user',
  },
  undoAction: {
    message: 'Undo',
    context: 'Label for the button that will undo the last action taken on the users',
  },
  discardChanges: {
    message: 'Discard changes?',
    context: 'Heading for the confirmation modal that asks user if they want to discard changes',
  },
  discardAction: {
    message: 'Yes, Discard',
    context: 'Label for the button to dismiss selection changes',
  },
  discardWarning: {
    message: "Any selections you've made in this panel will be lost.",
    context: 'Warning message to inform user of lost selections if they discard changes',
  },
  keepEditingAction: {
    message: 'Keep editing',
    context: 'Label for the button to keep editing selections in the side panel',
  },

  // Selection warnings
  numUsersNotEnrolled: {
    message:
      '{num, number} {num, plural, one {user is} other {users are}} not enrolled in any class',
    context:
      'A notice indicating the number of users that are selected which are not enrolled in a class',
  },
  numLearnersEnrolledInNClasses: {
    message:
      '{num, number} {num, plural, one {learner is enrolled in} other {learners are enrolled in}} {numClasses, number} {numClasses, plural, one {class} other {classes}}',
    context:
      'A notice indicating the number of users that are selected which are enrolled in a class',
  },
  numUsersCoaches: {
    message: '{num, number} {num, plural, one {user is a coach} other {users are coaches}}',
    context: 'A notice indicating the number of users the user selected that are coaches',
  },
  numCoachesAssignedToNClasses: {
    message:
      '{num, number} {num, plural, one {coach is assigned to} other {coaches are assigned to}} {numClasses, number} {numClasses, plural, one {class} other {classes}}',
    context:
      'A notice indicating the number of coaches that are selected which are assigned to a class',
  },
  numAdminsSelected: {
    message: '{num, number} {num, plural, one {admin} other {admins}} selected',
    context: 'A notice indicating the number of admins that are selected',
  },
  usersNotInClasses: {
    message: 'Users already not in these classes stay unchanged',
    context: 'Warning message about users already not in selected classes',
  },

  // Assign coaches to class
  coachesAssignedNotice: {
    message: 'Selected coaches have been assigned',
    context:
      'Success notification shown after coaches have been successfully assigned to users/classes.',
  },
  assignCoachUndoneNotice: {
    message: 'Assign action has been undone',
    context:
      'Notification shown after the user has chosen to undo a recent coach assignment action.',
  },
  coachesAssignedToClassLabel: {
    message: 'Coaches assigned to this class',
    context: 'label to indicate coaches assigned to a class in sidepanel',
  },
  assignAction: {
    message: 'Assign',
    context: 'Label for the button that will assign coaches to classes',
  },
  numUsersNotAssigned: {
    message:
      '{num, number} {num, plural, one {user is} other {users are}} not assigned to any class',
    context:
      'A notice indicating the number of users that are selected which are not assigned to a class as coaches',
  },
  numUsersNotEligible: {
    message:
      "{num, number} {num, plural, one {learner} other {learners}} can't be assigned as coaches. They won't be added.",
    context:
      'A notice indicating the number of learners that are selected which cannot be assigned as coaches and will be skipped',
  },

  // Remove from class
  usersNotInClassNotAffected: {
    message: 'Users already not in selected classes will not be affected',
    context: 'Warning message about users already not in selected classes',
  },
  undoUsersRemovedHeading: {
    message:
      '{num, number} {num, plural, one {user has} other {users have}} been removed. Undo this?',
    context: 'Heading for undo confirmation after removing users',
  },
  undoUsersRemovedMessage: {
    message: 'Remove users undone',
    context: 'Snackbare message for undo confirmation after removing users',
  },
  usersRemovedNotice: {
    message: 'Selected users removed',
    context: 'Confirmation message when users are removed from classes',
  },
  removeUndoneNotice: {
    message: 'Remove action has been undone',
    context: 'Confirmation message when remove action is undone',
  },
  removeUsersFromClassesHeading: {
    message: 'Remove {numUsers, number} {numUsers, plural, one {user} other {users}} from classes',
    context: 'Heading for the side panel that allows users to remove users from classes',
  },
  removeFromAllClassesLabel: {
    message: 'Remove from all classes',
    context: 'Label for checkbox that allows user to remove selected users from all classes',
  },
  removeAction: {
    message: 'Remove',
    context: 'Label for the button that will remove users from classes',
  },

  // Enroll to class
  usersInClassNotAffected: {
    message: 'Users already in selected classes will not be affected',
    context: 'Warning message about users already in selected classes',
  },
  usersEnrolledNotice: {
    message: 'Selected users have been enrolled',
    context: 'Confirmation message when users are enrolled in classes',
  },
  enrollUndoneNotice: {
    message: 'Enroll action has been undone',
    context: 'Confirmation message when enroll action is undone',
  },
  enrollInAllClasses: {
    message: 'Enroll in all classes',
    context: 'Label for the selection to enroll users in all classes',
  },
  enrollUsersInClasses: {
    message: 'Enroll {num, number} {num, plural, one {user} other {users}}',
    context: 'Heading for the selection to enroll users in the selected classes',
  },
  enrollAction: {
    message: 'Enroll',
    context: 'Label for the button that will enroll users in classes',
  },
  enrollAClassLabel: {
    message: 'Enroll in a class',
    context: 'Label for the classes input field in the create user modal',
  },
  assignToAClassLabel: {
    message: 'Assign to a class',
    context: 'Label for the classes input field in the create user modal',
  },
  assignToAllClasses: {
    message: 'Assign to all classes',
    context: 'Label for checkbox that allows user to assign selected users to all classes',
  },
  enrollToAllClasses: {
    message: 'Enroll to all classes',
    context: 'Label for checkbox that allows user to enroll selected users in all classes',
  },

  // Move to trash
  moveToTrashLabel: {
    message: 'Remove {num, number} {num, plural, one {user} other {users}}',
    context: 'Title of the modal that allows users to move selected users to trash',
  },
  moveToTrashAction: {
    message: 'Yes, remove',
    context: 'Label for the button that confirms moving users to trash',
  },
  movingToTrash: {
    message: 'Removing users',
    context:
      'Message to users when they click to move users to the trash to indicate that something is happening in the background',
  },
  moveToTrashWarning: {
    message:
      'Users will be removed from all classes and immediately deactivated. Deactivated users will be deleted permanently after 30 days.',
    context: 'Warning message about trash deletion timeline',
  },
  usersTrashedNotice: {
    message: 'Selected users have been removed',
    context: 'Brief notification confirming users were removed',
  },
  trashUndoneNotice: {
    message: 'Remove has been undone',
    context: 'Notification confirming that the trash action was reversed',
  },

  // Copy a class
  copyClass: {
    message: 'Copy class',
    context: 'Page heading and button label',
  },
  classCopiedSuccessfully: {
    message: 'Class copied successfully',
    context: 'Message shown when class copying succeeds',
  },
  classNameAlreadyExists: {
    message: "Class name '{class}' already exists",
    context: 'Error message shown when trying to copy a class with a name that already exists',
  },
  makeACopy: {
    message: 'Make a copy',
    context: 'Button label for copying a class',
  },
  copyAllLearners: {
    message: 'Copy all learners ({n, number})',
    context: 'Label for checkbox that allows user to copy all learners from the class',
  },
  copyAllCoaches: {
    message: 'Copy all coaches ({n, number})',
    context: 'Label for checkbox that allows user to copy all coaches from the class',
  },

  // User Creation
  newUsers: {
    message: 'New users',
    context: 'Title of page listing recently created users',
  },
  backToUsers: {
    message: 'Back to Users',
    context: 'Link leading back to regular users table, away from the user creation page',
  },

  // User Creation Modal
  newUsersCreatedSuccess: {
    message: '{n, number} new {n, plural, one {user} other {users}} successfully created!',
    context: 'Title of modal shown on successful creation of users',
  },
  newUsersModalMessage: {
    message: 'You have successfully created {n, number} new {n, plural, one {user} other {users}}.',
    context: 'Initial message body in success modal when users are created',
  },
  whatsNext: {
    message: "Here's what you can do next:",
    context: 'Message preceding a list of things the user can do now that they added users',
  },
  carryOutBulkActions: {
    message: 'Carry out bulk actions',
    context: 'One of the options explained to the user',
  },
  carryOutBulkActionsExplainer: {
    message: 'Like enrolling your entire selection in one or more classes',
  },
  saveAndAddAnother: {
    message: 'Save and add another',
    context:
      'Button label on user creation form that submits the current form and then clears it for another entry on success',
  },
  saveAndContinue: {
    message: 'Save and continue',
    context:
      'Action label for users to save a new user and make another without leaving the current form',
  },
  saveAndContinueExplainer: {
    message:
      'You can close this modal interface and all your newly added users will be saved to this facility in the Users page',
    context: 'Explaining what the user can do if they save and continue',
  },
  enrollInClass: {
    message: 'Enroll in class',
    context: 'Action button label for beginning bulk actions',
  },
  copyOfClass: {
    message: 'Copy of {class}',
    context: 'Initial name of a class upon being copied',
  },
  // Error Handling
  defaultErrorMessage: {
    message: 'Sorry! Something went wrong, please try again.',
    context: 'Default error message for API errors.',
  },
  birthYearRangeError: {
    message: 'The start year cannot be greater than the end year.',
    context:
      'Error message shown when the start year is greater than the end year in the birth year range filter.',
  },

  // Users table
  allUsersFilteredOut: {
    message: "No users match the filter: '{filterText}'",
    context: "Refers to the 'Search for a user' filter when no users are found.",
  },
  noLearnersExist: {
    message: 'There are no learners in this facility',
    context:
      "Displayed when there are no learners in the facility. Seen when using the 'User type' filter on the 'Users' page.",
  },
  noCoachesExist: {
    message: 'There are no coaches in this facility',
    context:
      "Displayed when there are no coaches in the facility. Seen when using the 'User type' filter on the 'Users' page.",
  },
  noSuperAdminsExist: {
    message: 'There are no super admins in this facility',
    context:
      "Displayed when there are no super admins in the facility. Seen when using the 'User type' filter on the 'Users' page.",
  },
  noAdminsExist: {
    message: 'There are no admins in this facility',
    context:
      "Displayed when there are no admins in the facility. Seen when using the 'User type' filter on the 'Users' page.",
  },
  noNewUsersLabel: {
    message: 'No new users',
    context: 'Displayed when there are no recently created users in the facility.',
  },
  noNewUsersDescription: {
    message: 'New users added in the last 30 days will be stored here',
    context: 'Description shown when there are no recently created users in the facility.',
  },
  addNewUserLabel: {
    message: 'Add new user',
    context: 'Label for button that opens the user creation modal',
  },
  assignUsersHeading: {
    message: 'Assign {num, number} {num, plural, one {user} other {users}}',
    context: 'Side panel H1 heading showing the number of selected users to assign as coaches',
  },
  // Trash page
  removedUsersTitle: {
    message: 'Removed users',
    context: 'Title of the page listing users who have been removed from the facility.',
  },
  noRemovedUsersLabel: {
    message: 'No removed users',
    context: 'Displayed when there are no users who have been removed from the facility.',
  },
  removedUsersNotice: {
    message: 'Removed users are stored here for 30 days before being permanently deleted',
    context: 'Displayed when there are users who have been removed from the facility.',
  },
  removedUsersPageDescription: {
    message: 'Records will show the days remaining before permanent deletion.',
    context: 'Description shown on the trash page below the title.',
  },
  deletePermanentlyLabel: {
    message: 'Delete permanently',
    context: 'Label for the button to permanently delete a user from the facility.',
  },
  recoverLabel: {
    message: 'Recover',
    context: 'Label for the button to recover a user from the trash.',
  },
  recoverSelectionLabel: {
    message: 'Recover selection',
    context: 'Label for the button to recover multiple users from the trash.',
  },
  permanentDeletion: {
    message: 'Permanent deletion',
    context:
      'Label for the column of the users table indicating when a user will be deleted permanently.',
  },
  deleteSelectionLabel: {
    message: 'Delete selection?',
    context: 'Label for the confirmation dialog when permanently deleting multiple users.',
  },
  deleteSelectionDescription: {
    message:
      'This will permanently delete {num, number} {num, plural, one {user} other {users}} from this device. You cannot undo this.',
    context:
      'Description shown in the confirmation dialog when permanently deleting multiple users.',
  },
  deletingLabel: {
    message: 'Deleting',
    context: 'Message to indicate that users are being deleted.',
  },
  usersDeletedNotice: {
    message: 'Selected users have been deleted',
    context: 'Displayed when users have been successfully deleted.',
  },
  usersRecoveredNotice: {
    message: '{num, number} {num, plural, one {user} other {users}} recovered',
    context: 'Displayed when users have been successfully recovered.',
  },
});
