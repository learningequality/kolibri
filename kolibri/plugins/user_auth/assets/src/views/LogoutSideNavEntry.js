import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import navComponents from 'kolibri.utils.navComponents';
import coreStrings from 'kolibri.utils.coreStrings';
import urls from 'kolibri.urls';

const component = {
  name: 'LogoutSideNavEntry',
  get url() {
    return urls['kolibri:kolibri.plugins.user_auth:user_auth']();
  },
  get label() {
    return coreStrings.$tr('signIn');
  },
  icon: 'login',
  role: UserKinds.ANONYMOUS,
  priority: 10,
  section: NavComponentSections.ACCOUNT,
};

navComponents.register(component);

export default component;
