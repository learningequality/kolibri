import Vue from 'vue';
import logger from 'kolibri-logging';
import AuthMessage from 'kolibri/components/AuthMessage';
import useUser from 'kolibri/composables/useUser';

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
  const useUserObject = useUser();
  const originalProps = component.props || [];
  const originalMethods = component.methods || [];
  return Vue.component('WithAuthMessage', {
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
        const getter = useUserObject[getterName]?.value;
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
