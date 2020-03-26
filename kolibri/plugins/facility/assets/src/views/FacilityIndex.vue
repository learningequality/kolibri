<template>

  <CoreBase
    :authorized="userIsAuthorized"
    :authorizationErrorDetails="$tr('adminOrSuperuser')"
    :showSubNav="userIsAuthorized && !immersivePageProps.immersivePage"
    v-bind="immersivePageProps"
  >
    <template
      v-if="pageName !== 'AllFacilitiesPage'"
      v-slot:sub-nav
    >
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
        'inMultipleFacilityPage',
        'currentFacilityName',
        'currentActiveFacility',
      ]),
      ...mapState('classAssignMembers', ['class']),
      pageName() {
        return this.$route.name;
      },
      immersivePageProps() {
        let immersivePageRoute;
        let appBarTitle = '';
        if (
          this.pageName === PageNames.CLASS_ENROLL_LEARNER ||
          this.pageName === PageNames.CLASS_ASSIGN_COACH
        ) {
          immersivePageRoute = {
            name: PageNames.CLASS_EDIT_MGMT_PAGE,
            params: {
              facility_id: this.currentActiveFacility,
            },
          };
          if (this.class) {
            appBarTitle = this.class.name || '';
          }
        }
        if (
          this.pageName === PageNames.USER_EDIT_PAGE ||
          this.pageName === PageNames.USER_CREATE_PAGE
        ) {
          immersivePageRoute = {
            name: PageNames.USER_MGMT_PAGE,
            params: {
              facility_id: this.currentActiveFacility,
            },
          };
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
        if (this.inMultipleFacilityPage) {
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
        // TODO handle multiple facility case
        return this.isAdmin || this.isSuperuser;
      },
    },
    $trs: {
      adminOrSuperuser: 'You must be signed in as an admin or super admin to view this page',
      facilityLabelWithName: 'Facility - {facilityName}',
    },
  };

</script>


<style lang="scss" scoped></style>
