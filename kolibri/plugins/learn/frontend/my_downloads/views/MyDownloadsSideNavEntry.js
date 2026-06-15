import { createTranslator } from 'kolibri/utils/i18n';
import { UserKinds, NavComponentSections } from 'kolibri/constants';
import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import plugin_data from 'kolibri-plugin-data';

const navStrings = createTranslator('MyDownloadsSideNavEntryStrings', {
  myDownloadsLabel: {
    message: 'My downloads',
    context: "Users can access and see their content downloads via 'my downloads' option.",
  },
});

if (plugin_data.allowLearnerDownloads) {
  registerNavItem({
    get url() {
      return urls['kolibri:kolibri.plugins.learn:my_downloads']();
    },
    get label() {
      return navStrings.$tr('myDownloadsLabel');
    },
    icon: 'download',
    role: UserKinds.LEARNER,
    section: NavComponentSections.ACCOUNT,
  });
}
