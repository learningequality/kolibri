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
    :showSubNav="false"
  >
    <template #sub-nav>
      <TopNavbar />
    </template>

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
        <template #headers>
          <th>{{ $tr('classNameLabel') }}</th>
          <th>{{ coachString('coachesLabel') }}</th>
          <th>{{ coachString('learnersLabel') }}</th>
        </template>
        <template #tbody>
          <transition-group
            tag="tbody"
            name="list"
          >
            <tr
              v-for="classObj in classList"
              :key="classObj.id"
            >
              <td>
                <KRouterLink
                  :text="classObj.name"
                  :to="$router.getRoute('HomePage', { classId: classObj.id })"
                  icon="classes"
                />
              </td>
              <td>
                <TruncatedItemList :items="classObj.coaches.map(c => c.full_name)" />
              </td>
              <td>
                {{ $formatNumber(classObj.learner_count) }}
              </td>
            </tr>
          </transition-group>
        </template>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  // Don't lint this file because I added random uses of $tr() that parse properly
  // in the AST - but don't really do anything.

  /* eslint-disable */

  import { mapState } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import urls from 'kolibri/urls';
  import commonCoach from './common';
  import useUser from 'kolibri/composables/useUser';

  export default {
    name: 'TestComponent',
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { isClassCoach, isFacilityCoach } = useUser();
      return { isClassCoach, isFacilityCoach };
    },
    computed: {
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
