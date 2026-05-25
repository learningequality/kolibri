import { createTranslator } from 'kolibri/utils/i18n';

export const impactStoryStrings = createTranslator('ImpactStoryBanner', {
  title: {
    message: 'How has Kolibri made an impact on your teachers or learners?',
    context: 'Heading on the impact-story banner.',
  },
  message: {
    message:
      "We're collecting before-and-after moments of teachers or learners using Kolibri. " +
      "Help us inspire others by sharing the impact Kolibri has made on an individual's journey.",
    context: 'Body text on the impact-story banner.',
  },
  dismiss: {
    message: 'Dismiss',
    context: 'Accessible label for the impact-story banner dismiss button.',
  },
  whatsappLine: {
    message: 'WhatsApp: {phoneNumber}',
    context:
      'WhatsApp contact line in the impact-story banner. {phoneNumber} is filled in at runtime.',
  },
  whatsappIntroText: {
    message: `Hi! I'd like to share a Kolibri story.
We have {learnerCount, number, integer} {learnerCount, plural, one {learner} other {learners}} in the {facilityName} facility.`,
    context:
      "Message pre-filled into the WhatsApp chat when the admin opens the link. Includes the admin's facility name and learner count so the recipient can recognise the deployment. {learnerCount} and {facilityName} are filled in at runtime.",
  },
  storyFormLine: {
    message: 'Online form: {url}',
    context: 'Web-form contact line in the impact-story banner. {url} is filled in at runtime.',
  },
  qrAlt: {
    message: 'WhatsApp QR code',
    context: 'Alt text for the WhatsApp QR code image.',
  },
});
