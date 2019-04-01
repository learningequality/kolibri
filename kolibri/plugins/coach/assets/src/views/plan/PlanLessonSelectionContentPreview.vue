<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="coachStrings.$tr('manageResourcesAction')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >
    <LessonContentPreviewPage
      :currentContentNode="currentContentNode"
      :isSelected="isSelected"
      :questions="preview.questions"
      :displaySelectOptions="Boolean(workingResources)"
      :completionData="preview.completionData"
      @addResource="handleAddResource"
      @removeResource="handleRemoveResource"
    />
  </CoreBase>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import LessonContentPreviewPage from '../plan/LessonContentPreviewPage';
  import Index from '../CoachIndex';
  import commonCoach from '../common';

  const indexStrings = crossComponentTranslator(Index);

  export default {
    name: 'PlanLessonSelectionContentPreview',
    components: {
      LessonContentPreviewPage,
    },
    mixins: [commonCoach],
    $trs: {},
    computed: {
      ...mapState(['toolbarRoute']),
      ...mapState('lessonSummary', ['workingResources']),
      ...mapState('lessonSummary/resources', ['currentContentNode', 'preview']),
      isSelected() {
        if (this.workingResources && this.currentContentNode && this.currentContentNode.id) {
          return this.workingResources.includes(this.currentContentNode.id);
        }
        return false;
      },
    },
    beforeDestroy() {
      this.clearSnackbar();
    },
    methods: {
      ...mapActions(['createSnackbar', 'clearSnackbar']),
      ...mapActions('lessonSummary', ['addToResourceCache']),
      handleAddResource(content) {
        this.$store.commit('lessonSummary/ADD_TO_WORKING_RESOURCES', content.id);
        this.addToResourceCache({ node: content });
        this.createSnackbar(indexStrings.$tr('resourcesAddedSnackbarText', { count: 1 }));
      },
      handleRemoveResource(content) {
        this.$store.commit('lessonSummary/REMOVE_FROM_WORKING_RESOURCES', content.id);
        this.createSnackbar(indexStrings.$tr('resourcesRemovedSnackbarText', { count: 1 }));
      },
    },
  };

</script>


<style lang="scss" scoped></style>
