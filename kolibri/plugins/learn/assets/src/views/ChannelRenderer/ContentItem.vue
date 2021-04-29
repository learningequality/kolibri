<template>

  <div>
    <template v-if="sessionReady">
      <KContentRenderer
        v-if="!assessment"
        class="content-renderer"
        v-bind="contentProps"
        v-on="contentHandlers"
      />

      <AssessmentWrapper
        v-else
        class="content-renderer"
        v-bind="exerciseProps"
        v-on="exerciseHandlers"
      />
    </template>
    <KCircularLoader v-else />

  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { updateContentNodeProgress } from '../../modules/coreLearn/utils';
  import AssessmentWrapper from '../AssessmentWrapper';

  export default {
    name: 'ContentItem',
    components: {
      AssessmentWrapper,
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        wasIncomplete: false,
        sessionReady: false,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'currentUserId']),
      ...mapState({
        masteryAttempts: state => state.core.logging.mastery.totalattempts,
        summaryProgress: state => state.core.logging.summary.progress,
        summaryTimeSpent: state => state.core.logging.summary.time_spent,
        sessionProgress: state => state.core.logging.session.progress,
        extraFields: state => state.core.logging.summary.extra_fields,
        fullName: state => state.core.session.full_name,
      }),
      contentIsExercise() {
        return this.contentNode.kind === ContentNodeKinds.EXERCISE;
      },
      contentHandlers() {
        if (this.contentIsExercise) {
          return {};
        }
        return {
          startTracking: this.startTracking,
          stopTracking: this.stopTracking,
          updateProgress: this.updateProgress,
          addProgress: this.addProgress,
          updateContentState: this.updateContentState,
        };
      },
      contentProps() {
        if (this.contentIsExercise) {
          return {};
        }
        return {
          kind: this.contentNode.kind,
          lang: this.contentNode.lang,
          files: this.contentNode.files,
          options: this.contentNode.options,
          available: this.contentNode.available,
          extraFields: this.extraFields,
          progress: this.summaryProgress,
          userId: this.currentUserId,
          userFullName: this.fullName,
          timeSpent: this.summaryTimeSpent,
        };
      },
      exerciseProps() {
        if (!this.contentIsExercise) {
          return {};
        }
        const assessment = assessmentMetaDataState(this.contentNode);
        return {
          id: this.contentNode.id,
          kind: this.contentNode.kind,
          files: this.contentNode.files,
          lang: this.contentNode.lang,
          randomize: this.contentNode.randomize,
          masteryModel: assessment.masteryModel,
          assessmentIds: assessment.assessmentIds,
          channelId: this.contentNode.channel_id,
          available: this.contentNode.available,
          extraFields: this.extraFields,
          progress: this.summaryProgress,
          userId: this.currentUserId,
          userFullName: this.fullName,
          timeSpent: this.summaryTimeSpent,
        };
      },
      exerciseHandlers() {
        if (!this.contentIsExercise) {
          return {};
        }
        return {
          startTracking: this.startTracking,
          stopTracking: this.stopTracking,
          updateProgress: this.updateExerciseProgress,
          updateContentState: this.updateContentState,
        };
      },
      contentId() {
        return this.contentNode.content_id;
      },
      contentNodeId() {
        return this.contentNode.id;
      },
      channelId() {
        return this.contentNode.channel_id;
      },
      contentKind() {
        return this.contentNode.kind;
      },
      content() {
        return this.contentNode;
      },
      assessment() {
        if (this.contentNode.kind !== ContentNodeKinds.EXERCISE) {
          return null;
        } else {
          return assessmentMetaDataState(this.contentNode);
        }
      },
      progress() {
        if (this.isUserLoggedIn) {
          // if there no attempts for this exercise, there is no progress
          if (this.contentKind === ContentNodeKinds.EXERCISE && this.masteryAttempts === 0) {
            return undefined;
          }
          return this.summaryProgress;
        }
        return this.sessionProgress;
      },
    },
    created() {
      return this.$store
        .dispatch('initContentSession', {
          channelId: this.channelId,
          contentId: this.contentId,
          contentKind: this.content.kind,
        })
        .then(() => {
          this.sessionReady = true;
          this.setWasIncomplete();
        });
    },
    beforeDestroy() {
      this.stopTracking();
    },
    methods: {
      startTracking() {
        return this.$store.dispatch('startTrackingProgress');
      },
      stopTracking() {
        return this.$store.dispatch('stopTrackingProgress');
      },
      setWasIncomplete() {
        this.wasIncomplete = this.progress < 1;
      },
      updateProgress(progressPercent, forceSave = false) {
        this.$store
          .dispatch('updateProgress', { progressPercent, forceSave })
          .then(updatedProgressPercent =>
            updateContentNodeProgress(this.channelId, this.contentNodeId, updatedProgressPercent)
          );
        this.$emit('updateProgress', progressPercent);
      },
      addProgress(progressPercent, forceSave = false) {
        this.$store
          .dispatch('addProgress', { progressPercent, forceSave })
          .then(updatedProgressPercent =>
            updateContentNodeProgress(this.channelId, this.contentNodeId, updatedProgressPercent)
          );
        this.$emit('addProgress', progressPercent);
      },
      updateExerciseProgress(progressPercent) {
        this.$emit('updateProgress', progressPercent);
      },
      updateContentState(contentState, forceSave = true) {
        this.$store.dispatch('updateContentState', { contentState, forceSave });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .content-renderer {
    // Needs to be one less than the ScrollingHeader's z-index of 4
    z-index: 3;
  }

</style>
