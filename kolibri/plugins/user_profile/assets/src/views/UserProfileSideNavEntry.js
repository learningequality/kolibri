import { UserKinds, NavComponentSections } from 'kolibri/constants';
import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';

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
