<template>

  <div class="new-coach-block">

    <ReportsGroupReportLessonExerciseHeader />

    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ coachStrings.$tr('questionLabel') }}</td>
          <td>{{ coachStrings.$tr('helpNeededLabel') }}</td>
          <td>{{ coachStrings.$tr('avgTimeSpentLabel') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><KRouterLink text="Question 1" :to="questionLink" /></td>
          <td>
            <LearnerProgressCount
              :count="3"
              :verbosity="1"
              verb="needHelp"
              icon="help"
          /></td>
          <td><TimeDuration :seconds="60*15" /></td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';
  import ReportsGroupReportLessonExerciseHeader from './ReportsGroupReportLessonExerciseHeader';

  export default {
    name: 'ReportsGroupReportLessonExerciseQuestionListPage',
    components: {
      ReportsGroupReportLessonExerciseHeader,
    },
    mixins: [imports],
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    computed: {
      questionLink() {
        return this.newCoachRoute('ReportsGroupReportLessonExerciseQuestionPage');
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
