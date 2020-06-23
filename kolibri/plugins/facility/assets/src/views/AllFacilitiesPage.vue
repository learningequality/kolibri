<template>

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

</template>


<script>

  import { mapGetters } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import cloneDeep from 'lodash/cloneDeep';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'AllFacilitiesPage',
    metaInfo() {
      return {
        title: this.coreString('allFacilitiesLabel'),
      };
    },
    components: {
      CoreTable,
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapGetters(['facilityPageLinks', 'inMultipleFacilityPage']),
      facilities() {
        return this.$store.state.core.facilities;
      },
    },
    beforeMount() {
      // Redirect to single-facility landing page if user/device isn't supposed
      // to manage multiple facilities
      if (!this.inMultipleFacilityPage) {
        this.$router.replace(this.facilityPageLinks.ManageClassPage);
      }
    },
    methods: {
      facilityLink(facility) {
        const link = cloneDeep(this.facilityPageLinks.ManageClassPage);
        link.params.facility_id = facility.id;
        return link;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
