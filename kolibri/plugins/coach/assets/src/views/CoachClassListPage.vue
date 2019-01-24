<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="false"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <h1>{{ coachStrings.$tr('classesLabel') }}</h1>
      <p>{{ $tr('classPageSubheader') }}</p>

      <table class="new-coach-table">
        <thead>
          <tr>
            <td>{{ $tr('classNameLabel') }}</td>
            <td>{{ coachStrings.$tr('coachesLabel') }}</td>
            <td>{{ coachStrings.$tr('learnersLabel') }}</td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="classObj in classList" :key="classObj.id">
            <td>
              <KRouterLink
                :text="classObj.name"
                :to="$router.getRoute('HomePage', { classId: classObj.id })"
              />
            </td>
            <td>
              <TruncatedItemList :items="classObj.coaches.map(c => c.full_name)" />
            </td>
            <td>
              {{ coachStrings.$tr('integer', { value: classObj.learner_count }) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoach from './common';

  export default {
    name: 'CoachClassListPage',
    components: {},
    mixins: [commonCoach],
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
    computed: {
      ...mapState(['classList']),
    },
  };

</script>


<style lang="scss" scoped></style>
