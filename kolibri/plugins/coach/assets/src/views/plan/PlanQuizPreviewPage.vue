<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    :immersivePageRoute="toolbarRoute"
    :immersivePagePrimary="true"
    :appBarTitle="appBarTitle"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
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
  </CoreBase>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import commonCoach from '../common';
  import LessonContentPreviewPage from '../plan/LessonContentPreviewPage';

  export default {
    name: 'PlanQuizPreviewPage',
    components: {
      LessonContentPreviewPage,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState(['toolbarRoute']),
      ...mapState('examCreation', ['preview', 'selectedExercises', 'currentContentNode']),
      isSelected() {
        return Boolean(this.selectedExercises[this.currentContentNode.id]);
      },
      appBarTitle() {
        return this.currentContentNode.title;
      },
    },
    beforeDestroy() {
      this.clearSnackbar();
    },
    methods: {
      ...mapActions(['createSnackbar', 'clearSnackbar']),
      ...mapActions('examCreation', ['addToSelectedExercises', 'removeFromSelectedExercises']),
      handleAddResource(content) {
        this.addToSelectedExercises([content]);
        this.createSnackbar(this.$tr('added', { item: this.currentContentNode.title }));
      },
      handleRemoveResource(content) {
        this.removeFromSelectedExercises([content]);
        this.createSnackbar(this.$tr('removed', { item: this.currentContentNode.title }));
      },
    },
    $trs: {
      added: "Added '{item}'",
      removed: "Removed '{item}'",
      // createNewExamLabel: 'Create new quiz',
    },
  };

</script>


<style lang="scss" scoped></style>
