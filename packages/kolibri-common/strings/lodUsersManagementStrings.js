import { createTranslator } from 'kolibri/utils/i18n';

export const lodUsersManagementStrings = createTranslator('LodUsersManagementStrings', {
  importedLabel: {
    message: 'Imported',
    context: 'Label indicating that a learner user account has already been imported.',
  },
  importUserLabel: {
    message: 'Import user',
    context: 'Label for the import users button and titles.',
  },
  importUserError: {
    message: 'Error importing user',
    context: 'Error message when importing a user fails.',
  },
  userAlreadyImportedError: {
    message: 'This user already exists on this device',
    context: 'Error message when trying to import a user that has already been imported.',
  },
  importUserSuccess: {
    message: 'Successfully imported user',
    context: 'Success message when importing a user is successful.',
  },
  removeUserSuccess: {
    message: 'Successfully removed user',
    context: 'Success message when removing a user is successful.',
  },
  removeUserError: {
    message: 'Error removing user',
    context: 'Error message when removing a user fails.',
  },
  selectAUser: {
    message: 'Select a user',
    context: 'Page title to select users for import.',
  },
  enterCredentials: {
    message: 'Enter the user credentials of the account you want to import.',
    context: 'Asking user and password of the user to be imported.',
  },
  enterAdminCredentials: {
    message: "Enter the username and password of a facility admin or a super admin of '{facility}'",
    context: 'Asking user and password of the  admin user of the facility to be imported',
  },
  deviceLimitationsTitle: {
    message: 'Device limitations',
    context:
      'Heading for the window which informs that only learner features will be available on the device. ',
  },
  deviceLimitationsMessage: {
    message:
      "'{full_name} ({username})' is a {non_admin_role} on '{device}'. This device is limited to features for learners only. Features for coaches and admins will not be available.",
    context:
      "Appears on 'Device limitations' window which informs that only learner features will be available on the device.",
  },
  deviceLimitationsAdminsMessage: {
    message:
      "'{full_name} ({username})' is an admin on '{device}'. This device is limited to features for learners only. Features for coaches and admins will not be available.",
    context:
      "Appears on 'Device limitations' window which informs that only learner features will be available on the device.",
  },
  doNotHaveUserCredentials: {
    message: "Don't have the user credentials?",
    context: "'Credentials' refers to learner's username and password.",
  },
  selectDifferentDeviceLabel: {
    message: "Don't see your learning facility?",
    context:
      'A label shown above a link that will open a modal to select a different network location from which to select a facility',
  },
  removeUserLabel: {
    message: 'Remove user',
    context: 'Label to remove a user from a device',
  },
  removeUserDescription: {
    message:
      'If you remove this user from this device you will still be able to access their account and all their data on the server.',
    context:
      'Explanation shown when a user is about to be removed from the device, reassuring that their data remains accessible elsewhere',
  },
  removeUserCallToAction: {
    message:
      'Please ensure that all data you would like to keep has been synced before removing this user. You will permanently lose any data that has not been synced.',
    context: 'Warning given before confirming user removal to avoid data loss',
  },
  editPermissionsAction: {
    message: 'Edit admin permissions',
    context: 'Button label for editing admin or super admin privileges of a user',
  },
  cannotRemoveUserTitle: {
    message: 'Cannot remove user',
    context: 'Title used when the system blocks removing a user due to permission restrictions',
  },
  cannotRemoveUserDescription: {
    message:
      'This user is the only super admin on this device and cannot be removed. Give or transfer super admin permissions to another user on this device if you would like to remove this user.',
    context:
      'Explanation shown when the user cannot be removed because they are the only super admin on the device',
  },
});
