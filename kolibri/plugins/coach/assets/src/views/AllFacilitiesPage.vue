<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >
    <AppBarPage
      :title="coreString('coachLabel')"
    >
      <KPageContainer>
        <h1>{{ coreString('facilitiesLabel') }} </h1>
        <CoreTable>
          <template #headers>
            <th>{{ coreString('nameLabel') }}</th>
            <th>{{ coreString('classesLabel') }}</th>
          </template>
          <template #tbody>
            <tbody>
              <tr v-for="facility in facilities" :key="facility.id">
                <td>
                  <KRouterLink
                    :text="facility.name"
                    :to="coachClassListPageLink(facility)"
                    icon="facility"
                  />
                </td>
                <td>
                  {{ $formatNumber(facility.num_classrooms) }}
                </td>
              </tr>
            </tbody>
          </template>
        </CoreTable>
      </KPageContainer>
    </AppBarPage>

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from './common';

  export default {
    name: 'AllFacilitiesPage',
    metaInfo() {
      return {
        title: this.coreString('allFacilitiesLabel'),
      };
    },
    components: {
      AppBarPage,
      CoreTable,
      NotificationsRoot,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      facilities() {
        return this.$store.state.core.facilities;
      },
    },
    beforeMount() {
      // Redirect to single-facility landing page if user/device isn't supposed
      // to manage multiple facilities
      if (!this.$store.getters.userIsMultiFacilityAdmin) {
        this.$router.replace(this.coachClassListPageLink());
      }
    },
    methods: {
      coachClassListPageLink(facility) {
        const query = {};
        if (facility) {
          query.facility_id = facility.id;
        }
        return {
          name: 'CoachClassListPage',
          query,
        };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
