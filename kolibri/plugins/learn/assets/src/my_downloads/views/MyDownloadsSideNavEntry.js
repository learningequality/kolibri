import { UserKinds, NavComponentSections } from 'kolibri/constants';
import { registerNavItem } from 'kolibri/composables/useNav';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import urls from 'kolibri/urls';
import plugin_data from 'kolibri-plugin-data';

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
