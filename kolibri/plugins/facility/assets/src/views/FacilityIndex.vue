<template>

  <CoreBase
    :authorized="userIsAuthorized"
    :authorizationErrorDetails="$tr('adminOrSuperuser')"
    :showSubNav="showSubNav"
    v-bind="immersivePageProps"
  >
    <template v-slot:sub-nav>
      <FacilityTopNav />
    </template>

    <router-view />

  </CoreBase>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';
  import FacilityTopNav from './FacilityTopNav';

  export default {
    name: 'FacilityIndex',
    components: {
      CoreBase,
      FacilityTopNav,
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapGetters([
        'isAdmin',
        'isSuperuser',
        'userIsMultiFacilityAdmin',
        'currentFacilityName',
        'activeFacilityId',
      ]),
      ...mapState('classAssignMembers', ['class']),
      pageName() {
        return this.$route.name;
      },
      showSubNav() {
        if (this.pageName === PageNames.ALL_FACILITIES_PAGE) {
          return false;
        }
        return this.userIsAuthorized && !this.immersivePageProps.immersivePage;
      },
      immersivePageProps() {
        let immersivePagePrimary = false;
        let immersivePageIcon = 'close';
        let immersivePageRoute;
        let appBarTitle = '';
        if (
          this.pageName === PageNames.CLASS_ENROLL_LEARNER ||
          this.pageName === PageNames.CLASS_ASSIGN_COACH
        ) {
          immersivePageRoute = this.$store.getters.facilityPageLinks.ClassEditPage;
          if (this.class) {
            appBarTitle = this.class.name || '';
          }
        } else if (
          this.pageName === PageNames.USER_EDIT_PAGE ||
          this.pageName === PageNames.USER_CREATE_PAGE
        ) {
          immersivePageRoute = this.$store.getters.facilityPageLinks.UserPage;
          appBarTitle = this.coreString('usersLabel');
        } else if (this.pageName === PageNames.IMPORT_CSV_PAGE) {
          immersivePageRoute = this.$store.getters.facilityPageLinks.DataPage;
          appBarTitle = this.$tr('importPageHeader');
        }

        if (immersivePageRoute) {
          return {
            immersivePage: true,
            immersivePageIcon,
            immersivePageRoute,
            immersivePagePrimary,
            appBarTitle,
          };
        }
        if (this.userIsMultiFacilityAdmin) {
          appBarTitle = this.$tr('facilityLabelWithName', {
            facilityName: this.currentFacilityName,
          });
        } else {
          appBarTitle = this.coreString('facilityLabel');
        }
        return {
          immersivePage: false,
          appBarTitle,
        };
      },
      userIsAuthorized() {
        if (this.isSuperuser) {
          // Superusers can view any facility
          return true;
        } else if (this.isAdmin) {
          if (this.pageName === PageNames.ALL_FACILITIES_PAGE) {
            return false;
          }
          // Admins can only see the facility they belong to
          return this.$store.state.core.session.facility_id === this.activeFacilityId;
        }
        return false;
      },
    },
    $trs: {
      adminOrSuperuser: 'You must be signed in as an admin or super admin to view this page',
      facilityLabelWithName: 'Facility – {facilityName}',
      importPageHeader: 'Import users from spreadsheet',
    },
  };

</script>


<style lang="scss" scoped></style>
