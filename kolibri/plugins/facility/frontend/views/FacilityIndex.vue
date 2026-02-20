<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    :authorizationErrorDetails="$tr('adminOrSuperuser')"
  >
    <router-view />
  </NotificationsRoot>

</template>


<script>

  import { mapGetters } from 'vuex';
  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';
  import { PageNames } from '../constants';

  export default {
    name: 'FacilityIndex',
    components: {
      NotificationsRoot,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { isAdmin, isSuperuser, session } = useUser();

      return {
        isAdmin,
        isSuperuser,
        session,
      };
    },
    computed: {
      ...mapGetters(['activeFacilityId']),
      pageName() {
        return this.$route.name;
      },
      inAllFacilitiesPage() {
        return this.pageName === PageNames.ALL_FACILITIES_PAGE;
      },
      userIsAuthorized() {
        if (this.isSuperuser) {
          // Superusers can view any facility
          return true;
        } else if (this.isAdmin) {
          if (this.inAllFacilitiesPage) {
            return false;
          }
          // Admins can only see the facility they belong to
          return this.session.facility_id === this.activeFacilityId;
        }
        return false;
      },
    },
    $trs: {
      adminOrSuperuser: {
        message: 'You must be signed in as an admin or super admin to view this page',
        context: 'Message to users indicating the types of users who can view the specified page.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .facility-index {
    height: 100%;
  }

</style>
