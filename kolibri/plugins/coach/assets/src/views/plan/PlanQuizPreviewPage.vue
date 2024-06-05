<template>

  <CoachImmersivePage
    :appBarTitle="appBarTitle"
    icon="back"
    :route="returnBackRoute"
    :primary="false"
  >
    <KPageContainer>
      <LessonContentPreviewPage
        :currentContentNode="currentContentNode"
        :isSelected="isSelected"
        :questions="preview.questions"
        :displaySelectOptions="true"
        :completionData="preview.completionData"
        @addResource="handleAddResource"
        @removeResource="handleRemoveResource"
      />
    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CoachImmersivePage from '../CoachImmersivePage';
  import LessonContentPreviewPage from '../plan/LessonContentPreviewPage';

  export default {
    name: 'PlanQuizPreviewPage',
    components: {
      CoachImmersivePage,
      LessonContentPreviewPage,
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
      ...mapActions('examCreation', ['addToSelectedExercises', 'removeFromSelectedExercises']),
      handleAddResource(content) {
        this.$router.push(this.returnBackRoute).then(() => {
          this.addToSelectedExercises([content]);
          this.showSnackbarNotification('resourcesAddedWithCount', { count: 1 });
        });
      },
      handleRemoveResource(content) {
        this.$router.push(this.returnBackRoute).then(() => {
          this.removeFromSelectedExercises([content]);
          this.showSnackbarNotification('resourcesRemovedWithCount', { count: 1 });
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
