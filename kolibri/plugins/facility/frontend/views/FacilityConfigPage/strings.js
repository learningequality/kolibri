import { createTranslator } from 'kolibri/utils/i18n';

export default createTranslator('FacilityConfigPage', {
  learnerCanEditUsername: {
    message: 'Allow learners to edit their username',
    context: "Option on 'Facility settings' page.",
  },
  learnerCanEditName: {
    message: 'Allow learners to edit their full name',
    context: "Option on 'Facility settings' page.",
  },
  learnerCanSignUp: {
    message: 'Allow learners to create accounts',
    context: "Option on 'Facility settings' page.",
  },
  learnerNeedPasswordToLogin: {
    message: 'Require password for learners',
    context: "Option on 'Facility settings' page.",
  },
  learnerCanEditPassword: {
    message: 'Allow learners to edit their password when signed in',
    context: "Option on 'Facility settings' page.",
  },
  showDownloadButtonInLearn: {
    message: "Show 'download' button with resources",
    context: "Option on 'Facility settings' page.\n",
  },
  enableMarkAttendance: {
    message: 'Allow coaches to take attendance (English only)',
    context: "Option on 'Facility settings' page.",
  },
  saveFailure: {
    message: 'There was a problem saving your settings',
    context: 'Status report after the facility change operation.',
  },
  saveSuccess: {
    message: 'Facility settings updated',
    context: 'Status report after the facility change operation.',
  },
  pageDescription: {
    message: 'Configure facility settings here.',
    context: 'Interpret as "[You can] configure facility settings here"',
  },
  deviceSettings: {
    message: 'You can also configure device settings',
    context: 'Text link on Facility settings page.',
  },
  pageHeader: {
    message: 'Facility settings',
    context: 'Title of the Facility > Settings page.',
  },
  documentTitle: {
    message: 'Facility Settings',
    context: 'Title of page where user can configure facility settings.',
  },
  deviceManagementPin: {
    message: 'Device management PIN',
    context: 'The title for the device management PIN',
  },
  deviceManagementDescription: {
    message:
      'This 4-digit PIN allows users to manage content and other settings on learn-only devices',
    context: 'Description for the device management',
  },
  createPinBtn: {
    message: 'Create PIN',
    context: 'Button for the create PIN',
  },
  changeLocation: {
    message: 'Change',
    context: 'Label to change primary storage location',
  },
  pinPlaceholder: {
    message: 'PIN',
    context: 'Placeholder label for a PIN input',
  },
});
