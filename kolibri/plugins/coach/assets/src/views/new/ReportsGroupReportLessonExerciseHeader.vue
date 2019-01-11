<template>

  <div>

    <p>
      <BackLink
        :to="newCoachRoute('ReportsGroupReportLessonPage')"
        :text="$tr('back', { lesson: lessonName })"
      />
    </p>
    <h1>Counting with big numbers</h1>
    <p>Advanced counting</p>

    <p>
      <MasteryModel model="num_correct_in_a_row_5" />
    </p>

    <KButton :text="coachStrings.$tr('previewAction')" />

    <div>
      <KRouterLink
        appearance="flat-button"
        class="new-coach-tab"
        :text="coachStrings.$tr('reportLabel')"
        :to="link('ReportsGroupReportLessonExerciseLearnerListPage')"
      />
      <KRouterLink
        appearance="flat-button"
        class="new-coach-tab"
        :text="coachStrings.$tr('difficultQuestionsLabel')"
        :to="link('ReportsGroupReportLessonExerciseQuestionListPage')"
      />
    </div>

    <hr>

  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsGroupReportLessonExerciseHeader',
    components: {},
    mixins: [imports],
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    methods: {
      link(page) {
        return { name: 'NEW_COACH_PAGES', params: { page } };
      },
    },
    $trs: {
      back: "Back to '{lesson}'",
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
