<template>

  <CoreBase
    :authorized="userIsAuthorized"
    :authorizationErrorDetails="$tr('adminOrSuperuser')"
    :showSubNav="userIsAuthorized && !immersivePageProps.immersivePage"
    v-bind="immersivePageProps"
  >
    <FacilityTopNav slot="sub-nav" />

    <!-- QUESTION should we explicitly define this in every page? -->
    <component :is="currentPage" />

  </CoreBase>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';
  import ClassEditPage from './ClassEditPage';
  import CoachClassAssignmentPage from './CoachClassAssignmentPage';
  import LearnerClassEnrollmentPage from './LearnerClassEnrollmentPage';
  import DataPage from './DataPage';
  import FacilitiesConfigPage from './FacilityConfigPage';
  import ManageClassPage from './ManageClassPage';
  import FacilityTopNav from './FacilityTopNav';
  import UserPage from './UserPage';
  import UserCreatePage from './UserCreatePage';
  import UserEditPage from './UserEditPage';

  const pageNameComponentMap = {
    [PageNames.CLASS_EDIT_MGMT_PAGE]: ClassEditPage,
    [PageNames.CLASS_MGMT_PAGE]: ManageClassPage,
    [PageNames.CLASS_ENROLL_LEARNER]: LearnerClassEnrollmentPage,
    [PageNames.CLASS_ASSIGN_COACH]: CoachClassAssignmentPage,
    [PageNames.DATA_EXPORT_PAGE]: DataPage,
    [PageNames.FACILITY_CONFIG_PAGE]: FacilitiesConfigPage,
    [PageNames.USER_MGMT_PAGE]: UserPage,
    [PageNames.USER_CREATE_PAGE]: UserCreatePage,
    [PageNames.USER_EDIT_PAGE]: UserEditPage,
  };

  export default {
    name: 'FacilityIndex',
    components: {
      CoreBase,
      FacilityTopNav,
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapGetters(['isAdmin', 'isSuperuser']),
      ...mapState(['pageName']),
      ...mapState('classAssignMembers', ['class']),
      immersivePageProps() {
        let immersivePageRoute;
        let appBarTitle = '';
        if (
          this.pageName === PageNames.CLASS_ENROLL_LEARNER ||
          this.pageName === PageNames.CLASS_ASSIGN_COACH
        ) {
          immersivePageRoute = this.$router.getRoute(PageNames.CLASS_EDIT_MGMT_PAGE);
          if (this.class) {
            appBarTitle = this.class.name || '';
          }
        }
        if (
          this.pageName === PageNames.USER_EDIT_PAGE ||
          this.pageName === PageNames.USER_CREATE_PAGE
        ) {
          immersivePageRoute = this.$router.getRoute(PageNames.USER_MGMT_PAGE);
          appBarTitle = this.coreString('usersLabel');
        }

        if (immersivePageRoute) {
          return {
            immersivePage: true,
            immersivePageIcon: 'arrow_back',
            immersivePageRoute: immersivePageRoute,
            immersivePagePrimary: true,
            appBarTitle,
          };
        }
        return {
          immersivePage: false,
          appBarTitle: this.coreString('facilityLabel'),
        };
      },
      currentPage() {
        return pageNameComponentMap[this.pageName] || null;
      },
      userIsAuthorized() {
        return this.isAdmin || this.isSuperuser;
      },
    },
    $trs: {
      adminOrSuperuser: 'You must be signed in as an admin or super admin to view this page',
    },
  };

</script>


<style lang="scss" scoped></style>
