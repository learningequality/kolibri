<template>

  <div>

    <p>
      <BackLink
        :to="classRoute('ReportsLessonReportPage')"
        :text="$tr('back', { lesson: lesson.title })"
      />
    </p>
    <h1>{{ exercise.title }}</h1>

    <!-- TODO COACH
    <p>{{ exercise.description }}</p>
    <p>
      {{ coachStrings.$tr('masteryModelLabel') }}
      <MasteryModel model="num_correct_in_a_row_5" />
    </p>
    <KButton :text="coachStrings.$tr('previewAction')" />
     -->

    <HeaderTabs>
      <HeaderTab
        :to="classRoute('ReportsLessonExerciseLearnerListPage')"
        :text="coachStrings.$tr('reportLabel')"
      />
      <HeaderTab
        :to="classRoute('ReportsLessonExerciseQuestionListPage')"
        :text="coachStrings.$tr('difficultQuestionsLabel')"
      />
    </HeaderTabs>

  </div>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsLessonExerciseHeader',
    components: {},
    mixins: [commonCoach],
    $trs: {
      back: "Back to '{lesson}'",
    },
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      exercise() {
        return this.contentMap[this.$route.params.exerciseId];
      },
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
