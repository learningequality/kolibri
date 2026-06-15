import { createTranslator } from 'kolibri/utils/i18n';
import { UserKinds, NavComponentSections } from 'kolibri/constants';
import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';

const navStrings = createTranslator('UserProfileSideNavEntryStrings', {
  profileLabel: {
    message: 'Profile',
    context: "Users can access and edit their personal details via the 'profile' option.",
  },
});

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.user_profile:user_profile']();
  },
  get label() {
    return navStrings.$tr('profileLabel');
  },
  icon: 'person',
  role: UserKinds.LEARNER,
  section: NavComponentSections.ACCOUNT,
});
