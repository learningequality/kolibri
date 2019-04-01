<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="appBarTitle"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >
    <LessonContentPreviewPage
      :currentContentNode="currentContentNode"
      :isSelected="isSelected"
      :questions="preview.questions"
      :displaySelectOptions="true"
      :completionData="preview.completionData"
      @addResource="handleAddResource"
      @removeResource="handleRemoveResource"
    />
  </CoreBase>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import commonCoach from '../common';
  import LessonContentPreviewPage from '../plan/LessonContentPreviewPage';
  import Index from '../CoachIndex';
  import CreateExamPage from './CreateExamPage';

  const indexStrings = crossComponentTranslator(Index);
  const CreateExamPageStrings = crossComponentTranslator(CreateExamPage);

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
        return CreateExamPageStrings.$tr('createNewExam');
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
        this.createSnackbar(indexStrings.$tr('added', { item: this.currentContentNode.title }));
      },
      handleRemoveResource(content) {
        this.removeFromSelectedExercises([content]);
        this.createSnackbar(indexStrings.$tr('removed', { item: this.currentContentNode.title }));
      },
    },
  };

</script>


<style lang="scss" scoped></style>
