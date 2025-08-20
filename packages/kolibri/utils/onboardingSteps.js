import { onboardingGuideString } from 'kolibri/uiText/kolibriOnboardingGuideStrings';

export const onboardingSteps = {
  LibraryPage: {
    label: 'libraryLabel',
    steps: [
      {
        key: 'Library',
        content: () => onboardingGuideString('onMyOwnLibraryMenuDescription'),
        stepIndex: 0,
      },
      {
        key: 'firstChannelCard',
        content: () => onboardingGuideString('channelCardDescription'),
        stepIndex: 1,
      },
      {
        key: 'wifiIconFirstChannelCard',
        content: () => onboardingGuideString('exploreLibraryDescription'),
        stepIndex: 2,
      },
      {
        key: 'menubar',
        content: () => onboardingGuideString('sideNavigationIconDecription'),
        stepIndex: 3,
      },
    ],
  },
  SideNavigation: {
    label: 'sideNavLabel',
    steps: [
      {
        key: 'deviceMenuOption',
        content: () => onboardingGuideString('deviceMenuOptionDescription'),
        stepIndex: 0,
      },
    ],
  },
  ExploreLibraries: {
    label: 'exploreGlobalLibrary',
    steps: [
      {
        key: 'folders',
        content: () => onboardingGuideString('foldersTabLabelDescription'),
        stepIndex: 0,
      },
      {
        key: 'search',
        content: () => onboardingGuideString('searchTabLabelDescription'),
        stepIndex: 1,
      },
    ],
  },
  ViewAndDownloadResources: {
    label: 'viewInformation',
    steps: [
      {
        key: 'channelCardIcon',
        content: () => onboardingGuideString('channelCardIconDescription'),
        stepIndex: 0,
      },
    ],
  },
};
