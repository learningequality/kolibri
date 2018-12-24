<template>

  <div class="new-coach-block">

    <ReportsGroupReportQuizHeader />

    <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
    <p>{{ $tr('averageScore', {score: 0.6}) }}</p>

    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ coachStrings.$tr('titleLabel') }}</td>
          <td>{{ coachStrings.$tr('scoreLabel') }}</td>
          <td>{{ coachStrings.$tr('progressLabel') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <KRouterLink
              text="April"
              :to="newCoachRoute('ReportsGroupReportQuizLearnerPage')"
            />
          </td>
          <td><Score /></td>
          <td><NotStarted :count="0" :total="10" /></td>
        </tr>
        <tr>
          <td>
            <KRouterLink
              text="Steve"
              :to="newCoachRoute('ReportsGroupReportQuizLearnerPage')"
            />
          </td>
          <td><Score /></td>
          <td><InProgress :count="8" :total="10" /></td>
        </tr>
        <tr>
          <td>
            <KRouterLink
              text="John"
              :to="newCoachRoute('ReportsGroupReportQuizLearnerPage')"
            />
          </td>
          <td><Score :value="0.1" /></td>
          <td><Completed :count="10" :total="10" /></td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';
  import ReportsGroupReportQuizHeader from './ReportsGroupReportQuizHeader';

  export default {
    name: 'ReportsGroupReportQuizLearnerListPage',
    components: {
      ReportsGroupReportQuizHeader,
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
      averageScore: 'Average score: {score, number, percent}',
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped></style>
