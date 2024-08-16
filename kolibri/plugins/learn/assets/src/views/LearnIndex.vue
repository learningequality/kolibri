<template slot-scope="{ loading }">

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
  >
    <router-view :loading="loading" />
  </NotificationsRoot>

</template>


<script>

  import { mapState } from 'vuex';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import plugin_data from 'plugin_data';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import { PageNames } from '../constants';

  export default {
    name: 'LearnIndex',
    components: {
      NotificationsRoot,
    },
    setup() {
      const { isUserLoggedIn } = useUser();
      return {
        isUserLoggedIn,
      };
    },
    computed: {
      ...mapState({
        loading: state => state.core.loading,
      }),

      userIsAuthorized() {
        if (this.pageName === PageNames.BOOKMARKS) {
          return this.isUserLoggedIn;
        }
        return (
          (plugin_data.allowGuestAccess && this.$store.getters.allowAccess) || this.isUserLoggedIn
        );
      },
    },
    methods: {},
  };

</script>


<style lang="scss" scoped>

  @import './learn';

</style>
