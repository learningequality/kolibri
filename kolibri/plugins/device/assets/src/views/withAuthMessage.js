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
// or AuthMessage, depending on whether a user has permissions.
// TODO replace with nested views
export default function withAuthMessage(component, authorizedRole) {
  const originalProps = component.props || [];
  const originalMethods = component.methods || [];
  return Vue.component('withAuthMessage', {
    props: { ...originalProps },
    beforeRouteEnter: component.beforeRouteEnter,
    beforeRouteUpdate: component.beforeRouteUpdate,
    beforeRouteLeave: component.beforeRouteLeave,
    methods: { ...originalMethods },
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
        return createElement(component, { props: { ...this.$props } });
      }
      return createElement(AuthMessage, { props: { authorizedRole } });
    },
  });
}
