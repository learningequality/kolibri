<template>

  <div>

    <p>
      <BackLink
        :to="classRoute('ReportsGroupReportLessonPage', {})"
        :text="coachString('backToLessonLabel', { lesson: lesson.title })"
      />
    </p>
    <h1>
      <KLabeledIcon icon="exercise" :label="exercise.title" />
    </h1>

    <!--
    <p>{{ exercise.description }}</p>
    <p>
      <MasteryModel model="num_correct_in_a_row_5" />
    </p>

    <KButton :text="coachString('previewAction')" />
    -->

    <HeaderTable v-if="$isPrint">
      <HeaderTableRow>
        <template #key>
          {{ coachString('groupNameLabel') }}
        </template>
        <template #value>
          {{ group.name }}
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template #key>
          {{ coachString('lessonLabel') }}
        </template>
        <template #value>
          {{ lesson.title }}
        </template>
      </HeaderTableRow>
    </HeaderTable>

    <HeaderTabs :enablePrint="true">
      <HeaderTab
        :text="coachString('reportLabel')"
        :to="classRoute('ReportsGroupReportLessonExerciseLearnerListPage')"
      />
      <HeaderTab
        :text="coachString('difficultQuestionsLabel')"
        :to="classRoute('ReportsGroupReportLessonExerciseQuestionListPage')"
      />
    </HeaderTabs>

  </div>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsGroupReportLessonExerciseHeader',
    mixins: [commonCoach],
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      exercise() {
        return this.contentMap[this.$route.params.exerciseId];
      },
      group() {
        return this.groupMap[this.$route.params.groupId];
      },
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
