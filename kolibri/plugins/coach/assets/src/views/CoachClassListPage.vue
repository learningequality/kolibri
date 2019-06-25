<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachCommon$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="false"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <h1>{{ coachCommon$tr('classesLabel') }}</h1>
      <p>{{ $tr('classPageSubheader') }}</p>

      <p v-if="classList.length === 0">
        <KExternalLink
          v-if="isAdmin && createClassUrl"
          :text="$tr('noClassesDetailsForAdmin')"
          :href="createClassUrl"
        />
        <span v-else>
          {{ emptyStateDetails }}
        </span>
      </p>

      <CoreTable v-else>
        <thead slot="thead">
          <tr>
            <th>{{ $tr('classNameLabel') }}</th>
            <th>{{ coachCommon$tr('coachesLabel') }}</th>
            <th>{{ coachCommon$tr('learnersLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="classObj in classList" :key="classObj.id">
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" classroom />
                <KRouterLink
                  :text="classObj.name"
                  :to="$router.getRoute('HomePage', { classId: classObj.id })"
                />
              </KLabeledIcon>
            </td>
            <td>
              <TruncatedItemList :items="classObj.coaches.map(c => c.full_name)" />
            </td>
            <td>
              {{ coachCommon$tr('integer', { value: classObj.learner_count }) }}
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import KExternalLink from 'kolibri.coreVue.components.KExternalLink';
  import urls from 'kolibri.urls';
  import commonCoach from './common';

  export default {
    name: 'CoachClassListPage',
    components: {
      KExternalLink,
    },
    mixins: [commonCoach],
    computed: {
      ...mapGetters(['isAdmin', 'isClassCoach', 'isFacilityCoach']),
      ...mapState(['classList']),
      // Message that shows up when state.classList is empty
      emptyStateDetails() {
        if (this.isClassCoach) {
          return this.$tr('noAssignedClassesDetails');
        }
        if (this.isAdmin) {
          return this.$tr('noClassesDetailsForAdmin');
        }
        if (this.isFacilityCoach) {
          return this.$tr('noClassesDetailsForFacilityCoach');
        }

        return '';
      },
      createClassUrl() {
        const facilityUrl = urls['kolibri:facilitymanagementplugin:facility_management'];
        if (facilityUrl) {
          return facilityUrl();
        }

        return '';
      },
    },
    $trs: {
      classPageSubheader: 'View learner progress and class performance',
      classNameLabel: 'Class name',
      noAssignedClassesHeader: "You aren't assigned to any classes",
      noAssignedClassesDetails:
        'Please consult your Kolibri administrator to be assigned to a class',
      noClassesDetailsForAdmin: 'Create a class and enroll learners',
      noClassesDetailsForFacilityCoach: 'Please consult your Kolibri administrator',
      noClassesInFacility: 'There are no classes yet',
    },
  };

</script>


<style lang="scss" scoped></style>
