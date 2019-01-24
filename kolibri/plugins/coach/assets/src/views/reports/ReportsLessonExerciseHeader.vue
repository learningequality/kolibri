<template>

  <div>

    <p>
      <BackLink
        :to="classRoute('ReportsLessonReportPage', {})"
        :text="$tr('back', { lesson: lessonName })"
      />
    </p>
    <h1>Counting with big numbers</h1>
    <p>Advanced counting</p>

    <p>
      {{ coachStrings.$tr('masteryModelLabel') }}
      <MasteryModel model="num_correct_in_a_row_5" />
    </p>

    <KButton :text="coachStrings.$tr('previewAction')" />

    <div>
      <KRouterLink
        appearance="flat-button"
        class="new-coach-tab"
        :text="coachStrings.$tr('reportLabel')"
        :to="link('ReportsLessonExerciseLearnerListPage')"
      />
      <KRouterLink
        appearance="flat-button"
        class="new-coach-tab"
        :text="coachStrings.$tr('difficultQuestionsLabel')"
        :to="link('ReportsLessonExerciseQuestionListPage')"
      />
    </div>

    <hr>

  </div>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsLessonExerciseHeader',
    components: {},
    mixins: [commonCoach],
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
