import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import navComponents from 'kolibri.utils.navComponents';
import { createTranslator } from 'kolibri.utils.i18n';
import urls from 'kolibri.urls';

const LogoutStrings = createTranslator('LogoutStrings', {
  signOut: {
    message: 'Sign out',
    context:
      "Users can exit Kolibri by selecting 'Sign out' from the user menu in the upper right corner.",
  },
});

const component = {
  name: 'LogoutSideNavEntry',
  get url() {
    return urls['kolibri:core:logout']();
  },
  get label() {
    return LogoutStrings.$tr('signOut');
  },
  icon: 'login',
  priority: 10,
  role: UserKinds.LEARNER,
  section: NavComponentSections.ACCOUNT,
};

navComponents.register(component);

export default component;
