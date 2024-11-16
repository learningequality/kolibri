import { createTranslator } from 'kolibri/utils/i18n';

export const kolibriOnboardingGuideStrings = createTranslator('kolibriOnboardingGuideStrings', {
  onMyOwnLibraryMenuDescription: {
    message:
      "This is where you will find your downloaded channels and learning materials. You can also find and explore other people's libraries around you.",
    context:
      'This is a description of the library menu option on the top appbar for the on my own setup super admin.',
  },
  exploreLibraryDescription: {
    message: "You can explore someone else's library when you see this symbol.",
    context:
      'This is a description of the icon that appears on a content card within the library page.',
  },
  sideNavigationIconDecription: {
    message: 'Open this menu to find other ways to use Kolibri.',
    context: 'This is a description of the icon menu button that opens the side navigation.',
  },
  deviceMenuOptionDescription: {
    message: 'You can download learning materials from the Device page.',
    context: 'This is a description of the Device menu option within the side navigation.',
  },
  foldersTabLabelDescription: {
    message: 'Explore the folders in each channel to find more learning materials.',
    context: 'This is a description of the Folders tab on the Explore Libraries page.',
  },
  searchTabLabelDescription: {
    message: 'Use filters to find learning materials by language, type of activity, or keywords.',
    context: 'This is a description of the Search tab on the Explore Libraries page.',
  },
  filtersPanelDescription: {
    message: 'Use filters to find materials by language, activity, or keywords.',
    context: 'This is a description of the filters panel that appears on the Library page.',
  },
  channelCardIconDescription: {
    message: 'Learn more about the material and download it to use anytime.',
    context:
      'This is a description of the info and add icons that appear on the channel card on the Explore Libraries page.',
  },
  fullDeviceLibraryMenuDescription: {
    message:
      'Your downloaded channels and learning materials will be here. You can also find and explore the libraries on devices of other people around you.',
    context:
      'This is a description of the library menu option on the top appbar for learn-only and full devices.',
  },
  contentPageTopBarDescription: {
    message:
      'Learn more information about this material, download it for later use, and find related materials.',
    context:
      'This is a description of the icons in the top app bar that appear on the content page.',
  },
  noSourceConnectionTextDescription: {
    message:
      'No channels yet. Start exploring libraries around you and find materials to add to your library.',
    context:
      'This is a message that appears when there is no content on the device and there is no source connection.',
  },
  homePageDescription: {
    message:
      'If there are any classes and materials currently available to you, they will appear on the home page.',
    context: 'This is a description of the learn home page.',
  },
});
