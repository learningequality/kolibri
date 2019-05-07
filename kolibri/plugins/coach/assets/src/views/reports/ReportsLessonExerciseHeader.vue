<template>

  <div>

    <p>
      <BackLink
        :to="classRoute('ReportsLessonReportPage')"
        :text="$tr('back', { lesson: lesson.title })"
      />
    </p>

    <KGrid cols="2">
      <KGridItem size="1">
        <h1>
          <KLabeledIcon>
            <KIcon slot="icon" exercise />
            {{ exercise.title }}
          </KLabeledIcon>
        </h1>
      </KGridItem>
      <KGridItem size="1" alignment="right">
        <KButton
          :text="coachStrings.$tr('previewAction')"
          @click="$emit('previewClick')"
        />
      </KGridItem>
    </KGrid>

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
