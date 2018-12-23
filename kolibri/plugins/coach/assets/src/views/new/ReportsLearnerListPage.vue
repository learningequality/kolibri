<template>

  <div class="new-coach-block">
    <ReportsHeader />
    <KCheckbox :label="coachStrings.$tr('viewByGroupsToggle')" />
    <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ coachStrings.$tr('nameLabel') }}</td>
          <td>{{ coachStrings.$tr('groupsLabel') }}</td>
          <td>{{ coachStrings.$tr('avgQuizScoreLabel') }}</td>
          <td>{{ coachStrings.$tr('lessonsAssignedLabel') }}</td>
          <td>{{ coachStrings.$tr('exercisesCompletedLabel') }}</td>
          <td>{{ coachStrings.$tr('resourcesViewedLabel') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><KRouterLink text="Alice" :to="link" /></td>
          <td><TruncatedItemList :items="['a', 'b']" /></td>
          <td><Score :value="0.8" /></td>
          <td>{{ coachStrings.$tr('integer', {value: 3}) }}</td>
          <td>{{ coachStrings.$tr('integer', {value: 4}) }}</td>
          <td>{{ coachStrings.$tr('integer', {value: 5}) }}</td>
        </tr>
        <tr>
          <td><KRouterLink text="John" :to="link" /></td>
          <td><TruncatedItemList :items="[]" /></td>
          <td><Score :value="0.2" /></td>
          <td>{{ coachStrings.$tr('integer', {value: 5}) }}</td>
          <td>{{ coachStrings.$tr('integer', {value: 4}) }}</td>
          <td>{{ coachStrings.$tr('integer', {value: 3}) }}</td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsLearnerListPage',
    components: {
      ReportsHeader,
    },
    mixins: [imports],
    computed: {
      link() {
        return { name: 'NEW_COACH_PAGES', params: { page: 'ReportsLearnerPage' } };
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
