<template>

  <div class="new-coach-block">

    <ReportsLessonExerciseHeader />

    <KCheckbox :label="coachStrings.$tr('viewByGroupsLabel')" />

    <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
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

  import imports from './imports';
  import ReportsLessonExerciseHeader from './ReportsLessonExerciseHeader';

  export default {
    name: 'ReportsLessonExerciseQuestionListPage',
    components: {
      ReportsLessonExerciseHeader,
    },
    mixins: [imports],
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
