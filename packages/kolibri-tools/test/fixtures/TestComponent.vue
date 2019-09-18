<template>

  <!--
    TEST COMPONENT - Stolen from a real Kolibri component - has a
    known quantity of each kind of Use to extract and test against.

    5 Common
    8 Total
  -->

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coreString('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="false"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <h1>{{ coachString('classesLabel') }}</h1>
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
            <th>{{ coachString('coachesLabel') }}</th>
            <th>{{ coachString('learnersLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="classObj in classList" :key="classObj.id">
            <td>
              <KLabeledIcon icon="classroom">
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
              {{ coachString('integer', { value: classObj.learner_count }) }}
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>

  </CoreBase>

</template>


<script>

  // Don't lint this file because I added random uses of $tr() that parse properly
  // in the AST - but don't really do anything.

  /* eslint-disable */

  import { mapGetters, mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import urls from 'kolibri.urls';
  import commonCoach from './common';

  export default {
    name: 'TestComponent',
    mixins: [commonCoach, commonCoreStrings],
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
        if (true) {
          return this.coreString('coachLabel');
        }

        return '';
      },
      createClassUrl() {
        const facilityUrl = urls['kolibri:kolibri.plugins.facility:facility_management'];
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
