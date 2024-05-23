import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import registerNavItem from 'kolibri.utils.registerNavItem';
import urls from 'kolibri.urls';
import coreStrings from 'kolibri.utils.coreStrings';

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.user_profile:user_profile']();
  },
  get label() {
    return coreStrings.$tr('profileLabel');
  },
  icon: 'person',
  role: UserKinds.LEARNER,
  section: NavComponentSections.ACCOUNT,
});
