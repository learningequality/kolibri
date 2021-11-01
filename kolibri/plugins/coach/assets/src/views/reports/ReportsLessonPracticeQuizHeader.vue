<template>

  <div>
    <section>
      <HeaderWithOptions>
        <template #header>
          <BackLink
            :to="classRoute('ReportsLessonReportPage', {})"
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
        <KLabeledIcon :icon="resource.kind" :label="resource.title" />
      </h1>
    </section>

    <HeaderTabs :enablePrint="true">
      <HeaderTab
        :to="classRoute('ReportsLessonPracticeQuizLearnerListPage')"
        :text="coachString('reportLabel')"
      />
      <HeaderTab
        :to="classRoute('ReportsLessonPracticeQuizQuestionListPage')"
        :text="coachString('difficultQuestionsLabel')"
      />
    </HeaderTabs>

  </div>

</template>


<script>

  import commonCoach from '../common';
  import HeaderWithOptions from '../common/HeaderWithOptions';

  export default {
    name: 'ReportsLessonPracticeQuizHeader',
    components: {
      HeaderWithOptions,
    },
    mixins: [commonCoach],
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      resource() {
        return this.contentMap[this.$route.params.practiceQuizId];
      },
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
