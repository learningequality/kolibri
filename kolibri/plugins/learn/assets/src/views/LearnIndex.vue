<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
  >
    <div>
      <router-view />
    </div>

  </NotificationsRoot>

</template>


<script>

  import { mapGetters } from 'vuex';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
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

  .content {
    height: 100%;
    margin: auto;
  }

</style>
