<template>

  <div class="new-coach-block">

    <ReportsExerciseClassReportHeader />

    <h2>{{ $tr('overall') }}</h2>
    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ $tr('tableHeaderQuestion') }}</td>
          <td>{{ $tr('tableHeaderNeedHelp') }}</td>
          <td>{{ $tr('tableHeaderTimeSpent') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><KRouterLink text="Question 1" :to="questionLink" /></td>
          <td>
            <NeedHelp
              :count="3"
              :total="12"
              :showRatio="true"
              :verbosity="1"
          /></td>
          <td><TimeDuration :seconds="60*15" /></td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import TimeDuration from './shared/TimeDuration';
  import NeedHelp from './shared/status/NeedHelp';
  import ReportsExerciseClassReportHeader from './ReportsLessonExerciseHeader';

  export default {
    name: 'ReportsLessonExerciseQuestionListPage',
    components: {
      TimeDuration,
      NeedHelp,
      ReportsExerciseClassReportHeader,
      KRouterLink,
    },
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    computed: {
      questionLink() {
        return {
          name: 'NEW_COACH_PAGES',
          params: { page: 'ReportsLessonExerciseQuestionPage' },
        };
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {
      overall: 'Overall',
      tableHeaderQuestion: 'Question',
      tableHeaderNeedHelp: 'Help needed',
      tableHeaderTimeSpent: 'Average time spent',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
