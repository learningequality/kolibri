<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coreString('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="false"
    :pageTitle="coreString('allFacilitiesLabel')"
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
  </CoreBase>

</template>


<script>

  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from './common';

  export default {
    name: 'AllFacilitiesPage',
    components: {
      CoreBase,
      CoreTable,
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
