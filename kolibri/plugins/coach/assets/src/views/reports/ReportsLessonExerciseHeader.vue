<template>

  <div>

    <section>
      <BackLinkWithOptions>
        <BackLink
          slot="backlink"
          :to="classRoute('ReportsLessonReportPage')"
          :text="$tr('back', { lesson: lesson.title })"
        />
        <KButton
          slot="options"
          :text="common$tr('previewAction')"
          @click="$emit('previewClick')"
        />
      </BackLinkWithOptions>
      <h1>
        <KLabeledIcon>
          <KIcon slot="icon" exercise />
          {{ exercise.title }}
        </KLabeledIcon>
      </h1>
    </section>

    <HeaderTabs>
      <HeaderTab
        :to="classRoute('ReportsLessonExerciseLearnerListPage')"
        :text="common$tr('reportLabel')"
      />
      <HeaderTab
        :to="classRoute('ReportsLessonExerciseQuestionListPage')"
        :text="common$tr('difficultQuestionsLabel')"
      />
    </HeaderTabs>

  </div>

</template>


<script>

  import commonCoach from '../common';
  import BackLinkWithOptions from '../common/BackLinkWithOptions';

  export default {
    name: 'ReportsLessonExerciseHeader',
    components: {
      BackLinkWithOptions,
    },
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
