<template>

  <CoachAppBarPage
    :appBarTitle="coreString('coachLabel')"
    :pageTitle="coreString('allFacilitiesLabel')"
  >
    <KPageContainer>
      <h1>{{ coreString('facilitiesLabel') }}</h1>
      <CoreTable>
        <template #headers>
          <th>{{ coreString('nameLabel') }}</th>
          <th>{{ coreString('classesLabel') }}</th>
        </template>
        <template #tbody>
          <tbody>
            <tr
              v-for="facility in facilities"
              :key="facility.id"
            >
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
  </CoachAppBarPage>

</template>


<script>

  import CoreTable from 'kolibri/components/CoreTable';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';
  import commonCoach from './common';
  import CoachAppBarPage from './CoachAppBarPage';

  export default {
    name: 'AllFacilitiesPage',
    components: {
      CoachAppBarPage,
      CoreTable,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { facility_id, userIsMultiFacilityAdmin } = useUser();
      return { facility_id, userIsMultiFacilityAdmin };
    },
    props: {
      subtopicName: {
        type: String,
        required: false,
        default: null,
      },
    },
    computed: {
      facilities() {
        return this.$store.state.core.facilities;
      },
    },
    beforeMount() {
      if (!this.userIsMultiFacilityAdmin) {
        const singleFacility = { id: this.facility_id };
        this.$router.replace(this.coachClassListPageLink(singleFacility));
      }
    },
    methods: {
      coachClassListPageLink(facility) {
        const params = {};
        if (facility) {
          params.facility_id = facility.id;
        }
        params.subtopicName = this.subtopicName;

        return {
          name: 'CoachClassListPage',
          params,
        };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
