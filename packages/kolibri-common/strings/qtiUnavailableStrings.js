import { createTranslator } from 'kolibri/utils/i18n';

export const qtiUnavailableStrings = createTranslator('qtiUnavailableStrings', {
  adminImportResourceContainsQTI: {
    message:
      'This resource contains one or more questions that are not supported in this version of Kolibri. Upgrade the Kolibri server and learner devices to version 0.21 or later for learners and coaches to access these questions.',
    context: 'Message for the QTI unavailable section on the Device > Import Content page',
  },
  adminImportChannelContainsQTI: {
    message:
      'This channel contains one or more questions that are not supported in this version of Kolibri. Upgrade the Kolibri server and learner devices to version 0.21 or later for learners and coaches to access these questions.',
    context: 'Message for the QTI unavailable section on the Device > Import Content page',
  },
  learnerAlertsQTIUnavailable: {
    message:
      'This exercise has questions that are unavailable in this version of Kolibri. Your coach, teacher, or administrator can help you. Upgrade Kolibri to version 0.21 or later to access these questions.',
    context:
      'Message to learners when they try to access a QTI unavailable exercise on the Learn > Content Viewer page',
  },
  coachAlertsQTIUnavailable: {
    message:
      'This exercise contains questions that are not supported in this version of Kolibri. You will need Kolibri 0.21 or later in order for learners to access these questions. Ask your administrator to upgrade the Kolibri server and learner devices.',
    context:
      'Message for the QTI unavailable when a coach tries to add or access a QTI exercise to a lesson or quiz',
  },
  questionUnavailableGenericLong: {
    message: 'One or more questions are unavailable. Upgrade Kolibri to version 0.21 or later.',
    context: 'Generic message for QTI unavailable content',
  },
  questionUnavailableGenericShort: {
    message: 'Question unavailable',
    context: 'Generic message for QTI unavailable content',
  },
});
