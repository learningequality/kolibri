<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
  >
    <router-view />

  </NotificationsRoot>

</template>


<script>

  import { mapGetters } from 'vuex';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import { PageNames } from '../constants';
  import plugin_data from 'plugin_data';

  export default {
    name: 'LearnIndex',
    components: {
      NotificationsRoot,
    },
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      userIsAuthorized() {
        if (this.pageName === PageNames.BOOKMARKS) {
          return this.isUserLoggedIn;
        }
        return (
          (plugin_data.allowGuestAccess && this.$store.getters.allowAccess) || this.isUserLoggedIn
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './learn';

</style>
