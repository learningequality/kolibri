<template>

  <div class="new-coach-block">

    <ReportsQuizHeader />

    <h2>{{ $tr('overall') }}</h2>
    <p>{{ $tr('averageScore', {score: 0.6}) }}</p>

    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ $tr('tableHeaderTitle') }}</td>
          <td>{{ $tr('tableHeaderScore') }}</td>
          <td>{{ $tr('tableHeaderProgress') }}</td>
          <td>{{ $tr('tableHeaderGroups') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <KRouterLink
              text="April"
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsQuizLearnerPage' }}"
            />
          </td>
          <td><Score /></td>
          <td><NotStarted :count="0" :total="10" /></td>
          <td><TruncatedItemList :groups="[]" /></td>
        </tr>
        <tr>
          <td>
            <KRouterLink
              text="Steve"
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsQuizLearnerPage' }}"
            />
          </td>
          <td><Score /></td>
          <td><InProgress :count="8" :total="10" /></td>
          <td><TruncatedItemList :groups="['a', 'b']" /></td>
        </tr>
        <tr>
          <td>
            <KRouterLink
              text="John"
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsQuizLearnerPage' }}"
            />
          </td>
          <td><Score :value="0.1" /></td>
          <td><Completed :count="10" :total="10" /></td>
          <td><TruncatedItemList :groups="['a', 'b', 'c', 'd']" /></td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';
  import ReportsQuizHeader from './ReportsQuizHeader';

  export default {
    name: 'ReportsQuizLearnerListPage',
    components: {
      ReportsQuizHeader,
    },
    mixins: [imports],
    data() {
      return {
        filter: 'allQuizzes',
      };
    },
    computed: {
      filterOptions() {
        return [
          {
            label: this.$tr('allQuizzes'),
            value: 'allQuizzes',
          },
          {
            label: this.$tr('activeQuizzes'),
            value: 'activeQuizzes',
          },
          {
            label: this.$tr('inactiveQuizzes'),
            value: 'inactiveQuizzes',
          },
        ];
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    $trs: {
      overall: 'Overall',
      averageScore: 'Average score: {score, number, percent}',
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
      tableHeaderTitle: 'Title',
      tableHeaderScore: 'Score',
      tableHeaderProgress: 'Progress',
      tableHeaderGroups: 'Groups',
    },
  };

</script>


<style lang="scss" scoped></style>
