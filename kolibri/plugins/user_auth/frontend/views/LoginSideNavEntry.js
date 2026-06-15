import { createTranslator } from 'kolibri/utils/i18n';
import { UserKinds, NavComponentSections } from 'kolibri/constants';
import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';

const navStrings = createTranslator('LoginSideNavEntryStrings', {
  signInLabel: {
    message: 'Sign in',
    context:
      "Users select the 'SIGN IN' button if they already have an account and a username in Kolibri to get access to the platform.",
  },
});

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.user_auth:user_auth']();
  },
  get label() {
    return navStrings.$tr('signInLabel');
  },
  icon: 'login',
  role: UserKinds.ANONYMOUS,
  section: NavComponentSections.ACCOUNT,
});
