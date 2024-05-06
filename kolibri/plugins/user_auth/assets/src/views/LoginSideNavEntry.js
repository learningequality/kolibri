import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import registerNavItem from 'kolibri.utils.registerNavItem';
import urls from 'kolibri.urls';
import coreStrings from 'kolibri.utils.coreStrings';

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
