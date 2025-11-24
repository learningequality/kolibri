import { createTranslator } from 'kolibri/utils/i18n';

export const bulkUserManagementStrings = createTranslator('BulkUserManagementStrings', {
  // Searching and filtering
  newUser: {
    message: 'New user',
    context: 'Button label that lets the user create a new user',
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
  noClassesInFacilityNotice: {
    message: 'There are no classes in this facility.',
    context: 'Message shown when there are no classes in the facility',
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
    message: 'View deleted users',
    context: 'Label for dropdown item that links user to trash page of soft-deleted users',
  },
  renameClassLabel: {
    message: 'Rename class',
    context: 'Label for dropdown item that allows user to modify the name of a class',
  },
  deleteClass: {
    message: 'Delete class',
    context: 'Label for dropdown item that allows user to delete a class',
  },

  // Bulk actions
  enrollInClass: {
    message: 'Enroll in class',
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
    message: 'Delete selected',
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
    message: 'Discard',
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
  numAdminsSelected: {
    message: '{num, number} {num, plural, one {admin} other {admins}} selected',
    context: 'A notice indicating the number of admins that are selected',
  },

  // Assign coaches to class
  coachesAssignedNotice: {
    message: 'Coaches assigned',
    context:
      'Success notification shown after coaches have been successfully assigned to users/classes.',
  },
  actionSuccessful: {
    message: 'Action successful',
    context: 'Notification shown after the user has completed a task that has updated successfully',
  },
  assignAction: {
    message: 'Assign',
    context: 'Label for the button that will assign coaches to classes',
  },
  numUsersNotEligible: {
    message:
      "{num, number} {num, plural, one {learner} other {learners}} can't be assigned as coaches.",
    context:
      'A notice indicating the number of learners that are selected which cannot be assigned as coaches and will be skipped',
  },

  // Remove from class
  usersRemovedNotice: {
    message: 'Selected users removed',
    context: 'Confirmation message when users are removed from classes',
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
  noUsersClassesNotice: {
    message: 'None of the selected users are enrolled or assigned to any classes.',
    context: 'Message shown when none of the selected users are in any classes',
  },

  // Enroll to class
  usersEnrolledNotice: {
    message: 'Users enrolled',
    context: 'Confirmation message when users are enrolled in classes',
  },
  enrollInAllClasses: {
    message: 'Enroll in all classes',
    context: 'Label for the selection to enroll users in all classes',
  },
  enrollUsersInClasses: {
    message: 'Enroll {num, number} {num, plural, one {user} other {users}}',
    context: 'Heading for the selection to enroll users in the selected classes',
  },
  coachesToEnroll: {
    message:
      "{num, number} {num, plural, one {selected coach user} other {selected coach users}} will be enrolled in class as {num, plural, one {a learner} other {learners}}. If you need to assign them as {num, plural, one {a coach} other {coaches}}, use the 'Assign coach' button instead.",
    context:
      'Warning to the user that they have selected coaches but are enrolling them as learners in a class',
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
    message: 'Delete {num, number} {num, plural, one {user} other {users}}',
    context: 'Title of the modal that allows users to move selected users to trash',
  },
  moveToTrashAction: {
    message: 'Delete',
    context: 'Label for the button that confirms moving users to trash',
  },
  movingToTrash: {
    message: 'Deleting users',
    context:
      'Message to users when they click to move users to the trash to indicate that something is happening in the background',
  },
  moveToTrashWarning: {
    message:
      'Users will be immediately removed from all classes and permanently deleted after 30 days.',
    context: 'Warning message about trash deletion timeline',
  },
  usersTrashedNotice: {
    message: 'Users deleted',
    context: 'Brief notification confirming users were deleted',
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
  saveAndAddAnother: {
    message: 'Save and add another',
    context:
      'Button label on user creation form that submits the current form and then clears it for another entry on success',
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
    message: 'The start year must not be later than the end year.',
    context:
      'Error message shown when the start year is greater than the end year in the birth year range filter.',
  },

  // Users table
  allUsersFilteredOut: {
    message: "No users match the filter: '{filterText}'",
    context: "Refers to the 'Search for a user' filter when no users are found.",
  },
  noUsersInFacility: {
    message: 'There are no users in this facility.',
    context: 'When there are no users at all in the facility',
  },
  noUsersMatchSearch: {
    message: 'No users match this search',
    context: 'Displayed when no users match the current search term.',
  },

  noUsersMatchFilter: {
    message: 'No users match {filtersCount, plural, one {this filter} other {these filters}}',
    context: 'Displayed when no users match the current filter selection.',
  },

  noUsersMatchFiltersAndSearch: {
    message:
      'No users match this search and {filtersCount, plural, one {this filter} other {these filters}}',
    context: 'Displayed when no users match the combination of search term and filter selection.',
  },
  noNewUsersLabel: {
    message: 'No new users',
    context: 'Displayed when there are no recently created users in the facility.',
  },
  noNewUsersDescription: {
    message: 'New users created in the last 30 days will appear here',
    context: 'Description shown when there are no recently created users in the facility.',
  },
  createNewUserLabel: {
    message: 'Create new user',
    context: 'Label for button that opens the user creation modal',
  },
  assignUsersHeading: {
    message: 'Assign {num, number} {num, plural, one {coach} other {coaches}}',
    context: 'Side panel H1 heading showing the number of selected users to assign as coaches',
  },
  // Trash page
  removedUsersTitle: {
    message: 'Deleted users',
    context: 'Title of the page listing users who have been removed from the facility.',
  },
  noRemovedUsersLabel: {
    message: 'No deleted users',
    context: 'Displayed when there are no users who have been removed from the facility.',
  },
  removedUsersNotice: {
    message: 'Deleted users will appear here for 30 days before being permanently deleted',
    context: 'Displayed when there are users who have been removed from the facility.',
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
    message: 'Recover selected',
    context: 'Label for the button to recover multiple users from the trash.',
  },
  permanentDeletion: {
    message: 'Permanent deletion',
    context:
      'Label for the column of the users table indicating when a user will be deleted permanently.',
  },
  deleteSelectionLabel: {
    message: 'Delete selected?',
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
    message: 'Selected users deleted',
    context: 'Displayed when users have been successfully deleted.',
  },
  usersRecoveredNotice: {
    message: '{num, number} {num, plural, one {user} other {users}} recovered',
    context: 'Displayed when users have been successfully recovered.',
  },
});
