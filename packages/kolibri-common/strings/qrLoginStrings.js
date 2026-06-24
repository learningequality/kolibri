import { createTranslator } from 'kolibri/utils/i18n';

export const qrLoginStrings = createTranslator('QRLoginStrings', {
  // Sign-in page
  scanQRCodeTitle: {
    message: 'Scan your QR code',
    context: 'Title on the QR sign-in page asking the learner to scan their card.',
  },
  scanQRCodeDescription: {
    message: 'Hold your card so the camera can see the QR code',
    context: 'Instructions shown beneath the scanner on the QR sign-in page.',
  },
  pointCameraAtCode: {
    message: 'Point the camera at the QR code on your card',
    context: 'Alternative phrasing of the scanner instruction.',
  },
  cameraStarting: {
    message: 'Starting camera…',
    context: 'Status message shown while the camera is being initialized.',
  },
  secureContextRequired: {
    message:
      'QR sign-in requires a secure (HTTPS) connection. Please ask a teacher or administrator for help, or sign in with your username.',
    context: 'Shown on non-secure (HTTP) deployments where the browser blocks camera access.',
  },
  cameraPermissionDenied: {
    message: 'Camera access was blocked. Ask a teacher or administrator to enable it.',
    context: 'Shown when the learner or browser denied camera permission.',
  },
  cameraNotFound: {
    message: 'No camera was found on this device.',
    context: 'Shown when the device has no camera available.',
  },
  cameraUnavailable: {
    message: 'The camera could not be started. Please ask a teacher or administrator for help.',
    context: 'Generic fallback when getUserMedia fails for an unknown reason.',
  },
  // Confirmation modal
  isThisYou: {
    message: 'Is this you?',
    context:
      'Title of the confirmation modal shown after a successful QR scan, before the session is created.',
  },
  yesSignIn: {
    message: 'Yes, sign in',
    context: 'Confirmation button in the QR sign-in confirm modal.',
  },
  noGoBack: {
    message: 'No, go back',
    context: 'Cancellation button in the QR sign-in confirm modal.',
  },
  verifyPrompt: {
    message: 'If this is not you, tap "No, go back" and scan your own card.',
    context: 'Helper text in the QR sign-in confirm modal.',
  },
  // Errors
  wrongQRCode: {
    message: 'That QR code was not recognized. Try again.',
    context: 'Error shown when the scanned token does not match any learner.',
  },
  // Auth link / toggle
  signInWithQRCode: {
    message: 'Sign in with a QR code',
    context: 'Link text on AuthBase to switch to the QR sign-in page.',
  },
  // Profile / card display
  myQRCode: {
    message: 'My QR code',
    context: 'Label shown next to the QR code on the learner profile page.',
  },
  // Facility config
  enableQrLogin: {
    message: 'Allow learners to sign in with a QR code',
    context: "Option on 'Facility settings' page.",
  },
  qrCodesAssigned: {
    message: 'Generating QR codes for learners…',
    context: 'Status shown while the bulk-assignment task is running.',
  },
  // Printable cards
  photoPlaceholder: {
    message: 'Photo',
    context: 'Label inside the photo placeholder box on printable QR cards.',
  },
  printWithQRCodes: {
    message: 'Print QR codes',
    context: 'Option in the print-format dialog on the all-passwords page.',
  },
  // ID Cards page
  idCards: {
    message: 'ID Cards',
    context: 'Navigation item label for the student ID cards management page.',
  },
  idCardsPageTitle: {
    message: 'Student ID Cards',
    context: 'Title of the ID Cards management page.',
  },
  idCardsPageDescription: {
    message: 'View, print, and manage QR code ID cards for learners.',
    context: 'Description shown below the ID Cards page title.',
  },
  uploadPhoto: {
    message: 'Upload photo',
    context: 'Button label for uploading a profile photo for a student ID card.',
  },
  replacePhoto: {
    message: 'Replace photo',
    context: 'Button label for replacing an existing profile photo.',
  },
  photoUploaded: {
    message: 'Photo updated',
    context: 'Success message after a photo is uploaded.',
  },
  uploadFailed: {
    message: 'Could not upload photo',
    context: 'Error message when a photo upload fails.',
  },
  regenerateQR: {
    message: 'Regenerate QR code',
    context: 'Button label for generating a new QR code token.',
  },
  generateQrCode: {
    message: 'Generate QR code',
    context:
      'Button label on a student ID card for assigning a QR code token to a learner who does not yet have one.',
  },
  generateQrCodes: {
    message: 'Generate QR codes',
    context:
      'Button label on the ID Cards page for bulk-assigning QR codes to learners who do not yet have one.',
  },
  regenerateQRConfirmTitle: {
    message: 'Regenerate QR code',
    context: 'Title of the confirmation modal for regenerating a QR code.',
  },
  regenerateQRConfirm: {
    message: 'Generate a new QR code for {name}?',
    context: 'Confirmation message in the regenerate QR modal.',
  },
  regenerateQRWarning: {
    message: 'The current QR code will stop working immediately. Print a new card to replace it.',
    context: 'Warning text in the regenerate QR confirmation modal.',
  },
  printCard: {
    message: 'Print card',
    context: 'Button label for printing a single student ID card.',
  },
  viewIdCard: {
    message: 'View ID card',
    context: "Tooltip/label for a link that opens a learner's student ID card preview.",
  },
  idCardLabel: {
    message: 'ID card',
    context: "Title used for a single learner's ID card preview.",
  },
  couldNotLoadIdCard: {
    message: 'Could not load ID card',
    context: "Error shown when a learner's ID card fails to load.",
  },
  printAllCards: {
    message: 'Print all cards',
    context: 'Button label for printing all student ID cards.',
  },
  noQrCodeAssigned: {
    message: 'No QR code assigned',
    context: 'Message shown when a learner does not yet have a QR login token.',
  },
  noLearnersFound: {
    message: 'No learners found',
    context: 'Empty-state message when no learners match the search filter.',
  },
  couldNotLoadLearners: {
    message: 'Could not load learners',
    context: 'Error shown when the list of learners fails to load on the ID Cards page.',
  },
  searchLearners: {
    message: 'Search learners',
    context: 'Placeholder text for the search input on the ID Cards page.',
  },
  printSelected: {
    message: 'Print selected ({count})',
    context: 'Button label for printing only the selected student ID cards.',
  },
  selectAll: {
    message: 'Select all',
    context: 'Link text for selecting all learners on the ID Cards page.',
  },
  deselectAll: {
    message: 'Deselect all',
    context: 'Link text for deselecting all learners on the ID Cards page.',
  },
  selectedCount: {
    message: '{count} selected',
    context: 'Status text showing how many learners are selected.',
  },
  uploadLogo: {
    message: 'Upload school logo',
    context: 'Button label for uploading a brand/school logo for printed ID cards.',
  },
  replaceLogo: {
    message: 'Replace logo',
    context: 'Button label for replacing the existing school logo.',
  },
  logoUploaded: {
    message: 'Logo updated',
    context: 'Success message after a school logo is uploaded.',
  },
  logoUploadFailed: {
    message: 'Could not upload logo',
    context: 'Error shown when uploading the school logo fails.',
  },
  // QR login info modal (#3)
  qrLoginInfoTitle: {
    message: 'About QR code sign-in',
    context: 'Title of the info modal explaining QR code login.',
  },
  qrLoginInfoDescription: {
    message:
      'Learners sign in by scanning a printed QR code card instead of typing a username and password. You can print cards from the ID Cards page. If a card is lost, an admin can generate a new one from the ID Cards page.',
    context: 'Description in the QR login info modal on the facility settings page.',
  },
  // Coach QR view (#4)
  coachQrCode: {
    message: 'QR code',
    context: 'Label for the QR code row in the coach learner detail view.',
  },
  // Attendance scanning (#6)
  scanToMarkPresent: {
    message: 'Scan to mark present',
    context: 'Button label for scanning a QR code to mark a learner present.',
  },
  learnerMarkedPresent: {
    message: '{name} marked present',
    context: 'Success message after scanning a learner QR code for attendance.',
  },
  learnerNotInClass: {
    message: 'This QR code does not belong to a learner in this class.',
    context: 'Error when a scanned QR code does not match any learner in the class.',
  },
  alreadyMarkedPresent: {
    message: '{name} is already marked present',
    context: 'Info message when scanning a QR code for a learner already marked present.',
  },
  // User edit print (#8)
  printIdCard: {
    message: 'Print ID card',
    context: 'Button label on the user edit page to print a single ID card.',
  },
  // Rate limiting (#1)
  tooManyAttempts: {
    message: 'Too many sign-in attempts. Please wait a minute and try again.',
    context: 'Error shown when rate limiting kicks in on the sign-in endpoint.',
  },
  // Bulk task progress (#2)
  generatingQrCodes: {
    message: 'Generating QR codes…',
    context: 'Status shown while the QR token bulk-assignment task is running.',
  },
  qrCodesGenerated: {
    message: 'QR codes generated successfully',
    context: 'Success message after the QR token bulk-assignment task completes.',
  },
  qrCodeGenerationFailed: {
    message: 'QR code generation failed',
    context: 'Error message if the QR token bulk-assignment task fails.',
  },
});
