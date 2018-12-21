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

    <p><MasteryModel model="num_correct_in_a_row_5" /></p>

    <KButton :text="$tr('preview')" />
    <KCheckbox :label="$tr('viewByGroups')" />

    <div>
      <KButton
        :text="$tr('report')"
        appearance="flat-button"
        @click="goTo('ReportsLessonExerciseLearnerListPage')"
      />
      <KButton
        :text="$tr('difficulties')"
        appearance="flat-button"
        @click="goTo('ReportsLessonExerciseQuestionsPage')"
      />
    </div>

  </div>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import BackLink from './shared/BackLink';
  import MasteryModel from './shared/MasteryModel';

  export default {
    name: 'ReportsLessonExerciseHeader',
    components: {
      MasteryModel,
      BackLink,
      KCheckbox,
      KButton,
    },
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {
      back: "Back to '{lesson}'",
      preview: 'Preview',
      report: 'Learner report',
      difficulties: 'Question difficulties',
      viewByGroups: 'View by groups',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
