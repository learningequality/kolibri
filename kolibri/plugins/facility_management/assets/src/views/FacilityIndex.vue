<template>

  <CoreBase
    :appBarTitle="appBarTitle"
    :immersivePage="isImmersive"
    immersivePageIcon="arrow_back"
    :immersivePageRoute="appBarBackLink"
    :immersivePagePrimary="true"
    :authorized="isAdmin || isSuperuser"
    :authorizationErrorDetails="$tr('adminOrSuperuser')"
  >

    <div class="facility-management">
      <!-- QUESTION should we explicitly define this in every page? -->
      <TopNav v-if="!isEnrollmentPage" />
      <component :is="currentPage" />
    </div>

  </CoreBase>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { PageNames } from '../constants';
  import classEditPage from './ClassEditPage';
  import coachClassAssignmentPage from './CoachClassAssignmentPage';
  import learnerClassEnrollmentPage from './LearnerClassEnrollmentPage';
  import dataPage from './DataPage';
  import facilitiesConfigPage from './FacilityConfigPage';
  import manageClassPage from './ManageClassPage';
  import TopNav from './TopNav';
  import userPage from './UserPage';

  const classEnrollmentPages = [PageNames.CLASS_ENROLL_LEARNER, PageNames.CLASS_ASSIGN_COACH];

  const pageNameComponentMap = {
    [PageNames.CLASS_EDIT_MGMT_PAGE]: classEditPage,
    [PageNames.CLASS_MGMT_PAGE]: manageClassPage,
    [PageNames.CLASS_ENROLL_LEARNER]: learnerClassEnrollmentPage,
    [PageNames.CLASS_ASSIGN_COACH]: coachClassAssignmentPage,
    [PageNames.DATA_EXPORT_PAGE]: dataPage,
    [PageNames.FACILITY_CONFIG_PAGE]: facilitiesConfigPage,
    [PageNames.USER_MGMT_PAGE]: userPage,
  };

  export default {
    $trs: {
      facilityTitle: 'Facility',
      adminOrSuperuser: 'You must be signed in as an admin or superuser to view this page',
      // here because going to use immersive-page
      detailPageReturnPrompt: 'Class details',
    },
    name: 'FacilityIndex',
    components: {
      CoreBase,
      TopNav,
    },
    computed: {
      ...mapGetters(['isAdmin', 'isSuperuser']),
      ...mapState(['pageName']),
      ...mapState({
        isEnrollmentPage: state => classEnrollmentPages.includes(state.pageName),
      }),
      topLevelPageName: () => TopLevelPageNames.MANAGE,
      currentPage() {
        return pageNameComponentMap[this.pageName] || null;
      },
      appBarTitle() {
        if (this.isEnrollmentPage) {
          return this.$tr('detailPageReturnPrompt');
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
  };

</script>


<style lang="scss" scoped></style>
