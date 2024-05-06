import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import registerNavItem from 'kolibri.utils.registerNavItem';
import coreStrings from 'kolibri.utils.coreStrings';
import urls from 'kolibri.urls';
import plugin_data from 'plugin_data';

if (plugin_data.allowLearnerDownloads) {
  registerNavItem({
    get url() {
      return urls['kolibri:kolibri.plugins.learn:my_downloads']();
    },
    get label() {
      return coreStrings.$tr('myDownloadsLabel');
    },
    icon: 'download',
    role: UserKinds.LEARNER,
    section: NavComponentSections.ACCOUNT,
  });
}
