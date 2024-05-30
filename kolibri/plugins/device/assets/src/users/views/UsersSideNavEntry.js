import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import registerNavItem from 'kolibri.utils.registerNavItem';
import urls from 'kolibri.urls';
import coreStrings from 'kolibri.utils.coreStrings';

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.device:users_management']();
  },
  get label() {
    return coreStrings.$tr('usersLabel');
  },
  icon: 'audience',
  role: UserKinds.ADMIN,
});
