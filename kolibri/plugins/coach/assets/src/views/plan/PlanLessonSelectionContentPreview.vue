<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="common$tr('manageResourcesAction')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >
    <KPageContainer noPadding>
      <LessonContentPreviewPage
        :currentContentNode="currentContentNode"
        :isSelected="isSelected"
        :questions="preview.questions"
        :displaySelectOptions="showSelectOptions"
        :completionData="preview.completionData"
        @addResource="handleAddResource"
        @removeResource="handleRemoveResource"
      />
    </KPageContainer>
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
    props: {
      // If set to true, will show the add/remove buttons.
      showSelectOptions: {
        type: Boolean,
        default: true,
      },
      // Override the toolbarRoute in vuex
      backRoute: {
        type: Object,
        required: false,
      },
    },
    computed: {
      toolbarRoute() {
        if (this.$route.query && this.$route.query.last) {
          return this.backRouteForQuery(this.$route.query);
        }

        return (
          this.backRoute || {
            ...this.$store.state.toolbarRoute,
            query: this.$route.query,
          }
        );
      },
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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
