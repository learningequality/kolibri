<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >
    <ImmersivePage
      :appBarTitle="appBarTitle"
      icon="back"
      :route="returnBackRoute"
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
    </ImmersivePage>

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import LessonContentPreviewPage from '../plan/LessonContentPreviewPage';

  export default {
    name: 'PlanQuizPreviewPage',
    components: {
      ImmersivePage,
      LessonContentPreviewPage,
      NotificationsRoot,
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
