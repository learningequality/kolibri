<template>

  <div class="new-coach-block">

    <ReportsGroupReportQuizHeader />

    <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ coachStrings.$tr('questionLabel') }}</td>
          <td>{{ coachStrings.$tr('helpNeededLabel') }}</td>
          <td>{{ $tr('avgTimeSpentLabel') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><KRouterLink text="Question 1" :to="questionLink" /></td>
          <td>
            <NeedHelp
              :count="12"
              :total="12"
              :showRatio="true"
              :verbosity="1"
          /></td>
          <td><TimeDuration :seconds="60*15" /></td>
        </tr>
        <tr>
          <td><KRouterLink text="Question 2" :to="questionLink" /></td>
          <td>
            <NeedHelp
              :count="1"
              :total="12"
              :showRatio="true"
              :verbosity="1"
          /></td>
          <td><TimeDuration :seconds="60*4" /></td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';
  import ReportsGroupReportQuizHeader from './ReportsGroupReportQuizHeader';

  export default {
    name: 'ReportsGroupReportQuizQuestionListPage',
    components: {
      ReportsGroupReportQuizHeader,
    },
    mixins: [imports],
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    computed: {
      questionLink() {
        return this.newCoachRoute('ReportsGroupReportQuizQuestionPage');
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {
      avgTimeSpentLabel: 'Average time spent',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
