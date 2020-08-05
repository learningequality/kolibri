<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="back"
    :immersivePageRoute="returnBackRoute"
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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import LessonContentPreviewPage from '../plan/LessonContentPreviewPage';

  export default {
    name: 'PlanLessonSelectionContentPreview',
    components: {
      LessonContentPreviewPage,
    },
    mixins: [commonCoreStrings, commonCoach],
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
    data() {
      return {
        justRemovedResource: false,
      };
    },
    computed: {
      returnBackRoute() {
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
        if (this.justRemovedResource) {
          return true;
        }
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
      ...mapActions(['clearSnackbar']),
      ...mapActions('lessonSummary', ['addToResourceCache']),
      handleAddResource(content) {
        this.$router.push(this.returnBackRoute).then(() => {
          this.$store.commit('lessonSummary/ADD_TO_WORKING_RESOURCES', [content]);
          this.addToResourceCache({ node: content });
          this.showSnackbarNotification('resourcesAddedWithCount', { count: 1 });
        });
      },
      handleRemoveResource(content) {
        // We need to remove the resource immediately to prevent that occurs when removing
        // the only resource
        this.justRemovedResource = true;
        this.$store.commit('lessonSummary/REMOVE_FROM_WORKING_RESOURCES', [content]);
        this.$router.push(this.returnBackRoute).then(() => {
          this.showSnackbarNotification('resourcesRemovedWithCount', { count: 1 });
        });
      },
    },
    $trs: {
      lessonLabel: 'Lesson',
    },
  };

</script>


<style lang="scss" scoped></style>
