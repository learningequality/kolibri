<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    :immersivePageRoute="toolbarRoute"
    :immersivePagePrimary="true"
    :appBarTitle="lessonNameLabel"
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
  import LessonContentPreviewPage from '../plan/LessonContentPreviewPage';
  import commonCoach from '../common';

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
      ...mapState('lessonSummary/resources', ['currentContentNode', 'preview', 'ancestors']),
      isSelected() {
        if (this.workingResources && this.currentContentNode && this.currentContentNode.id) {
          return this.workingResources.includes(this.currentContentNode.id);
        }
        return false;
      },
      lessonNameLabel() {
        const ancestorLength = this.ancestors ? this.ancestors.length : 0;
        const label =
          ancestorLength > 0 ? this.ancestors[ancestorLength - 1].title : this.$tr('lessonLabel');
        return label;
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
        this.createSnackbar(this.$tr('resourcesAddedSnackbarText', { count: 1 }));
      },
      handleRemoveResource(content) {
        this.$store.commit('lessonSummary/REMOVE_FROM_WORKING_RESOURCES', content.id);
        this.createSnackbar(this.$tr('resourcesRemovedSnackbarText', { count: 1 }));
      },
    },
    $trs: {
      lessonLabel: 'Lesson',
      resourcesAddedSnackbarText:
        'Added {count, number, integer} {count, plural, one {resource} other {resources}} to lesson',
      resourcesRemovedSnackbarText:
        'Removed {count, number, integer} {count, plural, one {resource} other {resources}} from lesson',
    },
  };

</script>


<style lang="scss" scoped></style>
