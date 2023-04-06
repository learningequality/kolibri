import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import navComponents from 'kolibri.utils.navComponents';
import urls from 'kolibri.urls';
import coreStrings from 'kolibri.utils.coreStrings';

const sideNavConfig = {
  name: 'UserProfileSideNavEntry',
  get url() {
    return urls['kolibri:kolibri.plugins.user_profile:user_profile']();
  },
  get label() {
    return coreStrings.$tr('profileLabel');
  },
  icon: 'person',
  role: UserKinds.LEARNER,
  priority: 10,
  section: NavComponentSections.ACCOUNT,
};

navComponents.register(sideNavConfig);

export default sideNavConfig;
