<template>

  <div>

    <section>
      <HeaderWithOptions>
        <template #header>
          <BackLink
            :to="classRoute('ReportsLessonReportPage')"
            :text="coachString('backToLessonLabel', { lesson: lesson.title })"
          />
        </template>
        <template #options>
          <KButton
            :text="coachString('previewAction')"
            @click="$emit('previewClick')"
          />
        </template>
      </HeaderWithOptions>
      <h1>
        <KLabeledIcon icon="exercise" :label="exercise.title" />
      </h1>
    </section>

    <HeaderTabs :enablePrint="true">
      <HeaderTab
        :to="classRoute('ReportsLessonExerciseLearnerListPage')"
        :text="coachString('reportLabel')"
      />
      <HeaderTab
        :to="classRoute('ReportsLessonExerciseQuestionListPage')"
        :text="coachString('difficultQuestionsLabel')"
      />
    </HeaderTabs>

  </div>

</template>


<script>

  import commonCoach from '../common';
  import HeaderWithOptions from '../common/HeaderWithOptions';

  export default {
    name: 'ReportsLessonExerciseHeader',
    components: {
      HeaderWithOptions,
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
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
