<template>

  <div>

    <p>
      <BackLink
        :to="{ name:'NEW_COACH_PAGES', params: {page: 'ReportsLessonPage'} }"
        :text="$tr('back', { lesson: lessonName })"
      />
    </p>
    <h1>Counting with big numbers</h1>
    <p>Advanced counting</p>

    <p>
      {{ $tr('masteryModelLabel') }}
      <MasteryModel model="num_correct_in_a_row_5" />
    </p>

    <KButton :text="$tr('preview')" />
    <KCheckbox :label="$tr('viewByGroups')" />

    <div>
      <KRouterLink
        appearance="flat-button"
        class="new-coach-tab"
        :text="$tr('learnerReport')"
        :to="link('ReportsLessonExerciseLearnerListPage')"
      />
      <KRouterLink
        appearance="flat-button"
        class="new-coach-tab"
        :text="$tr('difficulties')"
        :to="link('ReportsLessonExerciseQuestionListPage')"
      />
    </div>

    <hr>

  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsLessonExerciseHeader',
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
      preview: 'Preview',
      masteryModelLabel: 'Completion requirement:',
      learnerReport: 'Report',
      difficulties: 'Difficult questions',
      viewByGroups: 'View by groups',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
