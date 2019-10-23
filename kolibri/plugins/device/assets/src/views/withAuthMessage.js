import Vue from 'kolibri.lib.vue';
import logger from 'kolibri.lib.logging';
import store from 'kolibri.coreVue.vuex.store';
import AuthMessage from 'kolibri.coreVue.components.AuthMessage';

const logging = logger.getLogger(__filename);

// Higher-order component that will conditionally render the intended component
// or AuthMessage, depending on whether a user has permissions
export default function withAuthMessage(component, authorizedRole) {
  return Vue.component('withAuthMessage', {
    render(createElement) {
      // Map authorizedRole to specific getter
      const getterName = {
        contentManager: 'canManageContent',
        admin: 'isAdmin',
        superuser: 'isSuperuser',
      }[authorizedRole];

      let canAccess;
      if (getterName) {
        canAccess = () => store.getters[getterName];
      } else {
        logging.warn(`No default getter associated with authorizedRole ${authorizedRole}`);
        canAccess = () => true;
      }

      // canAccess should reference the 'store' import if it relies on a getter
      if (canAccess()) {
        return createElement(component);
      }
      return createElement(AuthMessage, { props: { authorizedRole } });
    },
  });
}
