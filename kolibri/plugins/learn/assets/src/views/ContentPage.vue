<template>

  <div v-if="sessionReady" class="content">

    <KContentRenderer
      v-if="!content.assessment"
      :kind="content.kind"
      :lang="content.lang"
      :files="content.files"
      :options="content.options"
      :available="content.available"
      :duration="content.duration"
      :extraFields="extraFields"
      :progress="summaryProgress"
      :userId="currentUserId"
      :userFullName="fullName"
      :timeSpent="summaryTimeSpent"
      @startTracking="startTracking"
      @stopTracking="stopTracking"
      @updateProgress="updateProgress"
      @addProgress="addProgress"
      @updateContentState="updateContentState"
      @navigateTo="navigateTo"
      @error="onError"
    />

    <AssessmentWrapper
      v-else
      :id="content.id"
      class="content-renderer"
      :kind="content.kind"
      :files="content.files"
      :lang="content.lang"
      :randomize="content.randomize"
      :masteryModel="content.masteryModel"
      :assessmentIds="content.assessmentIds"
      :channelId="channelId"
      :available="content.available"
      :extraFields="extraFields"
      :progress="summaryProgress"
      :userId="currentUserId"
      :userFullName="fullName"
      :timeSpent="summaryTimeSpent"
      @startTracking="startTracking"
      @stopTracking="stopTracking"
      @updateProgress="updateExerciseProgress"
      @updateContentState="updateContentState"
    />
  </div>
  <KCircularLoader v-else />

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { ContentNodeResource } from 'kolibri.resources';
  import router from 'kolibri.coreVue.router';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { updateContentNodeProgress } from '../modules/coreLearn/utils';
  import AssessmentWrapper from './AssessmentWrapper';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'ContentPage',
    components: {
      AssessmentWrapper,
    },
    mixins: [commonLearnStrings],
    data() {
      return {
        sessionReady: false,
      };
    },
    computed: {
      ...mapGetters(['currentUserId']),
      ...mapState('topicsTree', ['content']),
      ...mapState('topicsTree', {
        contentId: state => state.content.content_id,
        contentNodeId: state => state.content.id,
        channelId: state => state.content.channel_id,
        contentKind: state => state.content.kind,
      }),
      ...mapState({
        masteryAttempts: state => state.core.logging.mastery.totalattempts,
        summaryProgress: state => state.core.logging.summary.progress,
        summaryTimeSpent: state => state.core.logging.summary.time_spent,
        sessionProgress: state => state.core.logging.session.progress,
        extraFields: state => state.core.logging.summary.extra_fields,
        fullName: state => state.core.session.full_name,
      }),

      progress() {
        if (this.isUserLoggedIn) {
          // if there no attempts for this exercise, there is no progress
          if (this.content.kind === ContentNodeKinds.EXERCISE && this.masteryAttempts === 0) {
            return undefined;
          }
          return this.summaryProgress;
        }
        return this.sessionProgress;
      },
    },
    created() {
      return this.initSessionAction({
        channelId: this.channelId,
        contentId: this.contentId,
        contentKind: this.contentKind,
      }).then(() => {
        this.sessionReady = true;
        this.setWasIncomplete();
      });
    },
    beforeDestroy() {
      this.stopTracking();
    },
    methods: {
      ...mapActions({
        initSessionAction: 'initContentSession',
        updateProgressAction: 'updateProgress',
        addProgressAction: 'addProgress',
        startTracking: 'startTrackingProgress',
        stopTracking: 'stopTrackingProgress',
        updateContentNodeState: 'updateContentState',
      }),
      setWasIncomplete() {
        this.wasIncomplete = this.progress < 1;
      },
      updateProgress(progressPercent, forceSave = false) {
        this.updateProgressAction({ progressPercent, forceSave }).then(updatedProgressPercent =>
          updateContentNodeProgress(this.channelId, this.contentNodeId, updatedProgressPercent)
        );
        this.$emit('updateProgress', progressPercent);
      },
      addProgress(progressPercent, forceSave = false) {
        this.addProgressAction({ progressPercent, forceSave }).then(updatedProgressPercent =>
          updateContentNodeProgress(this.channelId, this.contentNodeId, updatedProgressPercent)
        );
        this.$emit('addProgress', progressPercent);
      },
      updateExerciseProgress(progressPercent) {
        this.$emit('updateProgress', progressPercent);
      },
      updateContentState(contentState, forceSave = true) {
        this.updateContentNodeState({ contentState, forceSave });
      },
      navigateTo(message) {
        let id = message.nodeId;
        return ContentNodeResource.fetchModel({ id })
          .then(contentNode => {
            router.push(this.genContentLink(contentNode.id, contentNode.is_leaf));
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
      // TODO: markAsComplete not used but may be re-added for upcoming progress/status work
      // markAsComplete() {
      //   this.wasIncomplete = false;
      // },
      onError(error) {
        this.$store.dispatch('handleApiError', error);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .content {
    z-index: 0;
    max-height: 100vh;
  }

</style>
