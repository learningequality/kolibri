<template>

  <div>

    <p>
      <BackLink
        :to="classRoute('ReportsGroupReportLessonPage', {})"
        :text="$tr('back', { lesson: lesson.title })"
      />
    </p>
    <h1>
      <KLabeledIcon>
        <KIcon slot="icon" exercise />
        {{ exercise.title }}
      </KLabeledIcon>
    </h1>

    <!--
    <p>{{ exercise.description }}</p>
    <p>
      <MasteryModel model="num_correct_in_a_row_5" />
    </p>

    <KButton :text="common$tr('previewAction')" />
    -->

    <HeaderTabs>
      <HeaderTab
        :text="common$tr('reportLabel')"
        :to="classRoute('ReportsGroupReportLessonExerciseLearnerListPage')"
      />
      <HeaderTab
        :text="common$tr('difficultQuestionsLabel')"
        :to="classRoute('ReportsGroupReportLessonExerciseQuestionListPage')"
      />
    </HeaderTabs>

  </div>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsGroupReportLessonExerciseHeader',
    components: {},
    mixins: [commonCoach],
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      exercise() {
        return this.contentMap[this.$route.params.exerciseId];
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
