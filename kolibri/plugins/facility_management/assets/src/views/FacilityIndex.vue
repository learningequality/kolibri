<template>

  <CoreBase
    :appBarTitle="appBarTitle"
    :immersivePage="isImmersive"
    immersivePageIcon="arrow_back"
    :immersivePageRoute="appBarBackLink"
    :immersivePagePrimary="true"
    :authorized="userIsAuthorized"
    :authorizationErrorDetails="$tr('adminOrSuperuser')"
    :showSubNav="userIsAuthorized && !isEnrollmentPage"
  >
    <FacilityTopNav slot="sub-nav" />

    <KPageContainer>
      <!-- QUESTION should we explicitly define this in every page? -->
      <component :is="currentPage" />
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
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

  const classEnrollmentPages = [PageNames.CLASS_ENROLL_LEARNER, PageNames.CLASS_ASSIGN_COACH];

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
      KPageContainer,
    },
    computed: {
      ...mapGetters(['isAdmin', 'isSuperuser']),
      ...mapState(['pageName']),
      ...mapState('classAssignMembers', ['class']),
      isEnrollmentPage() {
        return classEnrollmentPages.includes(this.pageName);
      },
      currentPage() {
        return pageNameComponentMap[this.pageName] || null;
      },
      userIsAuthorized() {
        return this.isAdmin || this.isSuperuser;
      },
      appBarTitle() {
        if (this.isEnrollmentPage) {
          if (this.class) {
            return this.class.name || '';
          }
        }
        return this.$tr('facilityTitle');
      },
      appBarBackLink() {
        if (this.isEnrollmentPage) {
          return {
            name: PageNames.CLASS_EDIT_MGMT_PAGE,
          };
        }
        return null;
      },
      isImmersive() {
        return this.isEnrollmentPage;
      },
    },
    $trs: {
      facilityTitle: 'Facility',
      adminOrSuperuser: 'You must be signed in as an admin or super admin to view this page',
      // here because going to use immersive-page
      detailPageReturnPrompt: 'Class details',
    },
  };

</script>


<style lang="scss" scoped></style>
