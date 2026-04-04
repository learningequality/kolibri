<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
  >
    <router-view />
  </NotificationsRoot>

</template>


<script>

  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import plugin_data from 'kolibri-plugin-data';
  import useUser from 'kolibri/composables/useUser';
  import { PageNames } from '../constants';

  export default {
    name: 'LearnIndex',
    components: {
      NotificationsRoot,
    },
    setup() {
      const { isUserLoggedIn, isAppContext } = useUser();
      return {
        isUserLoggedIn,
        isAppContext,
      };
    },
    computed: {
      allowAccess() {
        return plugin_data.allowRemoteAccess || this.isAppContext;
      },
      userIsAuthorized() {
        if (this.pageName === PageNames.BOOKMARKS) {
          return this.isUserLoggedIn;
        }
        return (plugin_data.allowGuestAccess && this.allowAccess) || this.isUserLoggedIn;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './learn';

</style>
