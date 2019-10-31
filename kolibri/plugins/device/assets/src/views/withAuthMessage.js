import Vue from 'kolibri.lib.vue';
import logger from 'kolibri.lib.logging';
import store from 'kolibri.coreVue.vuex.store';
import AuthMessage from 'kolibri.coreVue.components.AuthMessage';

const logging = logger.getLogger(__filename);

const roleToGetterMap = {
  contentManager: 'canManageContent',
  admin: 'isAdmin',
  superuser: 'isSuperuser',
};

// Higher-order component that will conditionally render the intended component
// or AuthMessage, depending on whether a user has permissions
export default function withAuthMessage(component, authorizedRole) {
  return Vue.component('withAuthMessage', {
    render(createElement) {
      let canAccess;

      // Map authorizedRole to specific getter
      const getterName = roleToGetterMap[authorizedRole];

      if (getterName) {
        const getter = store.getters[getterName];
        if (getter) {
          canAccess = () => getter;
        } else {
          logging.error(`Getter is not registered in store: ${getterName}`);
        }
      } else {
        logging.error(`No default getter associated with authorizedRole: ${authorizedRole}`);
      }

      // If withAuthMessage is configured incorrectly and canAccess ends up undefined,
      // we deny access by default.
      if (canAccess && canAccess()) {
        return createElement(component);
      }
      return createElement(AuthMessage, { props: { authorizedRole } });
    },
  });
}
