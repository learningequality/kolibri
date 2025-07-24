import { kolibriOnboardingGuideStrings } from 'kolibri-common/strings/kolibriOnboardingGuideStrings';

export const onboardingSteps = {
  Library: [
    {
      key: 'Library',
      content: kolibriOnboardingGuideStrings.$tr('onMyOwnLibraryMenuDescription'),
      stepIndex: 0,
    },
    {
      key: 'firstChannelCard',
      content: kolibriOnboardingGuideStrings.$tr('channelCardDescription'),
      stepIndex: 1,
    },
    {
      key: 'wifiIconFirstChannelCard',
      content: kolibriOnboardingGuideStrings.$tr('exploreLibraryDescription'),
      stepIndex: 2,
    },
    {
      key: 'menubar',
      content: kolibriOnboardingGuideStrings.$tr('sideNavigationIconDecription'),
      stepIndex: 3,
    },
  ],
  SideNavigation: [
    {
      key: 'deviceMenuOption',
      content: kolibriOnboardingGuideStrings.$tr('deviceMenuOptionDescription'),
      stepIndex: 0,
    },
  ],
};
