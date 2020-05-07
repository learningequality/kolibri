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
        <thead slot="thead">
          <tr>
            <th>{{ coreString('nameLabel') }}</th>
            <th>{{ coreString('classesLabel') }}</th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <tr v-for="facility in facilities" :key="facility.id">
            <td>
              <KLabeledIcon icon="facility">
                <KRouterLink
                  :text="facility.name"
                  :to="facilityLink(facility)"
                />
              </KLabeledIcon>
            </td>
            <td>
              {{ $formatNumber(facility.num_classrooms) }}
            </td>
          </tr>
        </tbody>
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
    methods: {
      facilityLink(facility) {
        return {
          name: 'CoachClassListPage',
          query: {
            facility_id: facility.id,
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
