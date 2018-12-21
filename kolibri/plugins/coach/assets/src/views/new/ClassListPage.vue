<template>

  <div>
    <h1>{{ $tr('classPageHeader') }}</h1>
    <p>{{ $tr('classPageSubheader') }}</p>

    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ $tr('tableHeaderClassName') }}</td>
          <td>{{ $tr('tableHeaderCoaches') }}</td>
          <td>{{ $tr('tableHeaderLearners') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <KRouterLink
              text="Some class"
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'HomePage' }}"
            />
          </td>
          <td><TruncatedItemList :items="['Jacob', 'Alice']" /></td>
          <td>12</td>
        </tr>
        <tr>
          <td>
            <KRouterLink
              text="Another class"
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'HomePage' }}"
            />
          </td>
          <td><TruncatedItemList :items="[]" /></td>
          <td>8</td>
        </tr>
        <tr>
          <td>
            <KRouterLink
              text="Conference"
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'HomePage' }}"
            />
          </td>
          <td><TruncatedItemList :items="['Steve', 'Julie', 'Jane', 'Alice', 'Jacob']" /></td>
          <td>100</td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ClassListPage',
    components: {},
    mixins: [imports],
    $trs: {
      classPageHeader: 'Classes',
      classPageSubheader: 'View learner progress and class performance',
      tableHeaderClassName: 'Class name',
      noAssignedClassesHeader: "You aren't assigned to any classes",
      noAssignedClassesDetails:
        'Please consult your Kolibri administrator to be assigned to a class',
      noClassesDetailsForAdmin: 'Create a class and enroll learners',
      noClassesDetailsForFacilityCoach: 'Please consult your Kolibri administrator',
      tableHeaderCoaches: 'Coaches',
      noClassesInFacility: 'There are no classes yet',
      tableHeaderLearners: 'Learners',
    },
  };

</script>


<style lang="scss" scoped></style>
