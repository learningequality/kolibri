import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import navComponents from 'kolibri.utils.navComponents';
import coreStrings from 'kolibri.utils.coreStrings';
import urls from 'kolibri.urls';

const component = {
  name: 'MyDownloadsSideNavEntry',
  get url() {
    return urls['kolibri:kolibri.plugins.learn:my_downloads']();
  },
  get label() {
    return coreStrings.$tr('myDownloadsLabel');
  },
  icon: 'download',
  role: UserKinds.LEARNER,
  priority: 10,
  section: NavComponentSections.ACCOUNT,
};

navComponents.register(component);

export default component;
