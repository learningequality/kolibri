import { UserKinds, NavComponentSections } from 'kolibri/constants';
import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.user_auth:user_auth']();
  },
  get label() {
    return coreStrings.$tr('signInLabel');
  },
  icon: 'login',
  role: UserKinds.ANONYMOUS,
  section: NavComponentSections.ACCOUNT,
});
