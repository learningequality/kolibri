<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="coachStrings.$tr('coachLabel')"
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
  import LessonContentPreviewPage from '../lessons/LessonContentPreviewPage';
  import Index from '../CoachIndex';
  import imports from './imports';

  const indexStrings = crossComponentTranslator(Index);

  export default {
    name: 'PlanQuizPreviewPage',
    components: {
      LessonContentPreviewPage,
    },
    mixins: [imports],
    $trs: {},
    computed: {
      ...mapState(['toolbarRoute']),
      ...mapState('examCreation', ['preview', 'selectedExercises', 'currentContentNode']),
      isSelected() {
        return (
          this.selectedExercises.findIndex(
            exercise => exercise.id === this.currentContentNode.id
          ) !== -1
        );
      },
    },
    methods: {
      ...mapActions(['createSnackbar']),
      ...mapActions(['createSnackbar']),
      ...mapActions('examCreation', ['addToSelectedExercises', 'removeFromSelectedExercises']),
      handleAddResource(content) {
        this.addToSelectedExercises([content]);
        const text = indexStrings.$tr('added', { item: this.currentContentNode.title });
        this.createSnackbar({ text, autoDismiss: true });
      },
      handleRemoveResource(content) {
        this.removeFromSelectedExercises([content]);
        const text = indexStrings.$tr('removed', { item: this.currentContentNode.title });
        this.createSnackbar({ text, autoDismiss: true });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
