<template>

  <CoachImmersivePage
    :appBarTitle="appBarTitle"
    icon="back"
    :route="returnBackRoute"
    :primary="false"
  >
    <KPageContainer>
      <PracticeQuizContentPreviewPage
        :currentContentNode="currentContentNode"
        :isSelected="isSelected"
        :questions="preview.questions"
        :displaySelectOptions="true"
        :isPracticeQuiz="true"
        :completionData="preview.completionData"
        @submit="handleSubmit"
      />
    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import commonCoach from '../../common';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import PracticeQuizContentPreviewPage from '../LessonContentPreviewPage/PracticeQuizContentPreviewPage';

  export default {
    name: 'PlanPracticeQuizPreviewPage',
    components: {
      CoachImmersivePage,
      PracticeQuizContentPreviewPage,
    },
    mixins: [commonCoreStrings, commonCoach],
    computed: {
      ...mapState(['toolbarRoute']),
      ...mapState('examCreation', ['preview', 'selectedExercises', 'currentContentNode']),
      isSelected() {
        return Boolean(this.selectedExercises[this.currentContentNode.id]);
      },
      appBarTitle() {
        return this.currentContentNode.title;
      },
      returnBackRoute() {
        return this.toolbarRoute;
      },
    },
    beforeDestroy() {
      this.clearSnackbar();
    },
    methods: {
      ...mapActions(['clearSnackbar']),
      ...mapActions('examCreation', ['addToSelectedExercises']),
      handleSubmit(content, id) {
        this.addToSelectedExercises([content]);
        this.$store
          .dispatch('examCreation/updateSelectedQuestions')
          .then(() => {
            const params = {
              classId: id,
              randomized: content.assessmentmetadata.randomize,
            };
            return this.$store.dispatch('examCreation/createPracticeQuizAndRoute', params);
          })
          .then(() => {
            this.showSnackbarNotification('quizCreated');
          })
          .catch(error => {
            const errors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
            if (errors) {
              this.showError = true;
              this.showTitleError = true;
            } else {
              this.$store.dispatch('handleApiError', { error });
            }
          });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
